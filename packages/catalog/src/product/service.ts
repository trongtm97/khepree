import { and, asc, eq, inArray, ne } from "drizzle-orm";
import {
  featureTranslations,
  features,
  getDb,
  planFeatures,
  planTranslations,
  plans,
  prices,
  productTranslations,
  products,
  type Database,
  type ProductPlatform,
} from "@khepree/db";
import { moneyMinorToSafeNumber } from "@khepree/types";
import { mapPlanFeatureRow } from "./features";
import { resolveLocalizedRow } from "./i18n";
import { parseProductMarketingMetadata } from "./metadata";
import { resolvePricingDisplayMode } from "./pricing";
import { isPriceAllowedForMarket, type MarketContext } from "./market";
import { isPurchasableBillingType } from "./types";
import type {
  PricingProductGroup,
  PublicPlan,
  PublicProductDetail,
  PublicProductSummary,
  PurchasableOffer,
} from "./types";

export interface ProductLocaleOptions {
  locale: string;
  fallbackLocale?: string;
  market?: MarketContext;
}

function mapProductSummary(
  product: typeof products.$inferSelect,
  translation: typeof productTranslations.$inferSelect,
): PublicProductSummary {
  return {
    publicId: product.publicId,
    slug: product.slug,
    name: translation.name,
    shortDescription: translation.shortDescription,
    description: translation.description,
    platforms: product.platformCapabilities as ProductPlatform[],
    status: product.status,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    locale: translation.locale,
    updatedAt: product.updatedAt,
  };
}

function mapPrice(row: typeof prices.$inferSelect) {
  return {
    publicId: row.publicId,
    currency: row.currency,
    region: row.region,
    amountMinor: row.amountMinor.toString(),
    amountMinorNumber: moneyMinorToSafeNumber(row.amountMinor),
    interval: row.interval,
    isActive: row.isActive,
  };
}

export class ProductService {
  constructor(private readonly db: Database | null = getDb()) {}

  async listPublicProducts(options: ProductLocaleOptions): Promise<PublicProductSummary[]> {
    if (!this.db) return [];

    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(asc(products.slug));

    if (rows.length === 0) return [];

    const translations = await this.db
      .select()
      .from(productTranslations)
      .where(
        inArray(
          productTranslations.productId,
          rows.map((row) => row.id),
        ),
      );

    return rows
      .map((product) => {
        const productTranslationsForRow = translations.filter((t) => t.productId === product.id);
        const translation = resolveLocalizedRow(
          productTranslationsForRow,
          options.locale,
          options.fallbackLocale,
        );
        return translation ? mapProductSummary(product, translation) : null;
      })
      .filter((row): row is PublicProductSummary => row !== null);
  }

  async getPublicProductBySlug(
    slug: string,
    options: ProductLocaleOptions,
  ): Promise<PublicProductDetail | null> {
    return this.getProductDetailBySlug(slug, options, { activeOnly: true });
  }

  async getProductPreviewBySlug(
    slug: string,
    options: ProductLocaleOptions & { previewToken: string; previewSecret: string },
  ): Promise<PublicProductDetail | null> {
    if (!this.db) return null;
    const [product] = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!product) return null;
    const { verifyProductPreviewToken } = await import("./preview-token");
    if (
      !verifyProductPreviewToken({
        productId: product.id,
        token: options.previewToken,
        secret: options.previewSecret,
      })
    ) {
      return null;
    }
    return this.getProductDetailBySlug(slug, options, { activeOnly: false, productRow: product });
  }

  private async getProductDetailBySlug(
    slug: string,
    options: ProductLocaleOptions,
    mode: { activeOnly: boolean; productRow?: typeof products.$inferSelect },
  ): Promise<PublicProductDetail | null> {
    if (!this.db) return null;

    const product =
      mode.productRow ??
      (
        await this.db
          .select()
          .from(products)
          .where(and(eq(products.slug, slug), eq(products.status, "active")))
          .limit(1)
      )[0];

    if (!product) return null;

    const translations = await this.db
      .select()
      .from(productTranslations)
      .where(eq(productTranslations.productId, product.id));

    const translation = resolveLocalizedRow(translations, options.locale, options.fallbackLocale);
    if (!translation) return null;

    const productPlans = await this.loadPlansForProduct([product.id], options, mode.activeOnly);
    const planBundle = productPlans.get(product.id) ?? [];

    return {
      ...mapProductSummary(product, translation),
      content: translation.content,
      marketing: parseProductMarketingMetadata(product.metadata),
      plans: planBundle,
    };
  }

  async listPricingGroups(options: ProductLocaleOptions): Promise<PricingProductGroup[]> {
    if (!this.db) return [];

    const summaries = await this.listPublicProducts(options);
    if (summaries.length === 0) return [];

    const productRows = await this.db
      .select()
      .from(products)
      .where(eq(products.status, "active"));

    const planMap = await this.loadActivePlans(
      productRows.map((row) => row.id),
      options,
    );

    return summaries
      .map((product) => {
        const dbProduct = productRows.find((row) => row.publicId === product.publicId);
        if (!dbProduct) return null;
        return {
          product,
          plans: planMap.get(dbProduct.id) ?? [],
        };
      })
      .filter((group): group is PricingProductGroup => group !== null && group.plans.length > 0);
  }

  async listCatalogProducts(options: ProductLocaleOptions): Promise<PublicProductSummary[]> {
    return this.listPublicProducts(options);
  }

  async getPurchasableOffer(
    planPublicId: string,
    pricePublicId: string,
    options: ProductLocaleOptions,
  ): Promise<PurchasableOffer | null> {
    if (!this.db) return null;

    const [plan] = await this.db
      .select()
      .from(plans)
      .where(eq(plans.publicId, planPublicId))
      .limit(1);
    if (!plan || plan.status !== "active" || !isPurchasableBillingType(plan.billingType)) {
      return null;
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, plan.productId))
      .limit(1);
    if (!product || product.status !== "active") return null;

    const [price] = await this.db
      .select()
      .from(prices)
      .where(and(eq(prices.publicId, pricePublicId), eq(prices.planId, plan.id)))
      .limit(1);
    if (!price || !price.isActive || price.amountMinor <= 0n) return null;
    if (!isPriceAllowedForMarket(price, options.market)) return null;

    const [productTranslationsForRow, planTranslationsForRow] = await Promise.all([
      this.db.select().from(productTranslations).where(eq(productTranslations.productId, product.id)),
      this.db.select().from(planTranslations).where(eq(planTranslations.planId, plan.id)),
    ]);

    const productTranslation = resolveLocalizedRow(
      productTranslationsForRow,
      options.locale,
      options.fallbackLocale,
    );
    const planTranslation = resolveLocalizedRow(
      planTranslationsForRow,
      options.locale,
      options.fallbackLocale,
    );
    if (!productTranslation || !planTranslation) return null;

    return {
      product: {
        id: product.id,
        publicId: product.publicId,
        slug: product.slug,
        name: productTranslation.name,
        licensingMode: product.licensingMode,
      },
      plan: {
        id: plan.id,
        publicId: plan.publicId,
        slug: plan.slug,
        name: planTranslation.name,
        billingType: plan.billingType,
        accessTermDays: plan.accessTermDays,
      },
      price: {
        id: price.id,
        publicId: price.publicId,
        currency: price.currency,
        amountMinor: price.amountMinor,
        interval: price.interval,
      },
    };
  }

  private async loadPlansForProduct(
    productIds: string[],
    options: ProductLocaleOptions,
    activeOnly: boolean,
  ): Promise<Map<string, PublicPlan[]>> {
    if (!this.db || productIds.length === 0) return new Map();

    const planRows = await this.db
      .select()
      .from(plans)
      .where(
        activeOnly
          ? and(inArray(plans.productId, productIds), eq(plans.status, "active"))
          : and(inArray(plans.productId, productIds), ne(plans.status, "archived")),
      )
      .orderBy(asc(plans.slug));

    return this.hydratePlans(planRows, options);
  }

  private async loadActivePlans(
    productIds: string[],
    options: ProductLocaleOptions,
  ): Promise<Map<string, PublicPlan[]>> {
    return this.loadPlansForProduct(productIds, options, true);
  }

  private async hydratePlans(
    planRows: Array<typeof plans.$inferSelect>,
    options: ProductLocaleOptions,
  ): Promise<Map<string, PublicPlan[]>> {
    if (!this.db || planRows.length === 0) return new Map();

    const planIds = planRows.map((row) => row.id);
    const [planTranslationRows, featureRows, priceRows] = await Promise.all([
      this.db.select().from(planTranslations).where(inArray(planTranslations.planId, planIds)),
      this.db
        .select({
          planId: planFeatures.planId,
          key: features.key,
          valueType: features.valueType,
          booleanValue: planFeatures.booleanValue,
          integerValue: planFeatures.integerValue,
          stringValue: planFeatures.stringValue,
          featureId: features.id,
        })
        .from(planFeatures)
        .innerJoin(features, eq(planFeatures.featureId, features.id))
        .where(inArray(planFeatures.planId, planIds)),
      this.db
        .select()
        .from(prices)
        .where(and(inArray(prices.planId, planIds), eq(prices.isActive, true)))
        .orderBy(asc(prices.currency), asc(prices.region)),
    ]);

    const featureTranslationRows =
      featureRows.length > 0
        ? await this.db
            .select()
            .from(featureTranslations)
            .where(
              inArray(
                featureTranslations.featureId,
                [...new Set(featureRows.map((row) => row.featureId))],
              ),
            )
        : [];

    const featuresByPlan = new Map<string, PublicPlan["features"]>();
    for (const row of featureRows) {
      const translations = featureTranslationRows.filter((t) => t.featureId === row.featureId);
      const label =
        resolveLocalizedRow(translations, options.locale, options.fallbackLocale)?.name ?? row.key;
      const list = featuresByPlan.get(row.planId) ?? [];
      list.push({
        ...mapPlanFeatureRow({
          key: row.key,
          name: label,
          valueType: row.valueType,
          booleanValue: row.booleanValue,
          integerValue: row.integerValue,
          stringValue: row.stringValue,
        }),
      });
      featuresByPlan.set(row.planId, list);
    }

    const pricesByPlan = new Map<string, PublicPlan["prices"]>();
    for (const row of priceRows) {
      const list = pricesByPlan.get(row.planId) ?? [];
      list.push(mapPrice(row));
      pricesByPlan.set(row.planId, list);
    }

    const byProduct = new Map<string, PublicPlan[]>();
    for (const row of planRows) {
      const translations = planTranslationRows.filter((t) => t.planId === row.id);
      const translation = resolveLocalizedRow(translations, options.locale, options.fallbackLocale);
      if (!translation) continue;

      const list = byProduct.get(row.productId) ?? [];
      list.push({
        publicId: row.publicId,
        slug: row.slug,
        name: translation.name,
        billingType: row.billingType,
        status: row.status,
        features: featuresByPlan.get(row.id) ?? [],
        prices: pricesByPlan.get(row.id) ?? [],
        pricingMode: resolvePricingDisplayMode(row.billingType),
      });
      byProduct.set(row.productId, list);
    }

    return byProduct;
  }
}

export function createProductService(db?: Database | null): ProductService {
  return new ProductService(db ?? getDb());
}
