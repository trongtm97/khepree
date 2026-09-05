import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { DEFAULT_CURRENCY } from "@khepree/config";
import {
  featureTranslations,
  features,
  getDb,
  mediaAssets,
  planFeatures,
  planTranslations,
  plans,
  prices,
  productTranslations,
  products,
  type Database,
  type ProductPlatform,
} from "@khepree/db";
import { getPublicObjectStorage } from "@khepree/storage";
import { moneyMinorToSafeNumber } from "@khepree/types";
import { mapPlanFeatureRow } from "./features";
import { availableLocalesOf, requireLocaleRow, resolveLocalizedRow } from "./i18n";
import {
  parseGalleryMediaPublicIds,
  parseOperatingSystems,
  parseProductMarketingMetadata,
  toPublicMedia,
} from "./metadata";
import { parseCoverMediaPublicId } from "./studio-field-policy";
import { resolvePublicFullDescription } from "./compose-legacy-description";
import { resolvePublicSeoFields } from "./public-display";
import { resolvePricingDisplayMode, selectDisplayPrice } from "./pricing";
import { isPriceAllowedForMarket, type MarketContext } from "./market";
import { isPurchasableBillingType } from "./types";
import type {
  PricingProductGroup,
  PublicPlan,
  PublicProductDetail,
  PublicProductMedia,
  PublicProductSummary,
  PublicStartingPrice,
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
  extras: {
    availableLocales: string[];
    icon: PublicProductMedia | null;
    cover: PublicProductMedia | null;
    gallery: PublicProductMedia[];
    startingPrice: PublicStartingPrice | null;
  },
  marketing?: ReturnType<typeof parseProductMarketingMetadata>,
): PublicProductSummary {
  const fullDescription = resolvePublicFullDescription({
    description: translation.description,
    content: translation.content,
    marketing,
    locale: translation.locale,
  });
  const seo = resolvePublicSeoFields({
    name: translation.name,
    slug: product.slug,
    shortDescription: translation.shortDescription,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    metadata: (product.metadata ?? {}) as Record<string, unknown>,
    hasIcon: Boolean(extras.icon),
  });
  return {
    publicId: product.publicId,
    slug: product.slug,
    name: translation.name,
    shortDescription: translation.shortDescription,
    description: fullDescription,
    platforms: product.platformCapabilities as ProductPlatform[],
    operatingSystems: parseOperatingSystems(product.metadata),
    status: product.status,
    seoTitle: translation.seoTitle?.trim() || seo.seoTitle,
    seoDescription:
      translation.seoDescription?.trim() || seo.seoDescription || translation.shortDescription,
    locale: translation.locale,
    availableLocales: extras.availableLocales,
    icon: extras.icon,
    cover: extras.cover,
    gallery: extras.gallery ?? [],
    startingPrice: extras.startingPrice,
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

  private publicUrl(objectKey: string): string | null {
    try {
      return getPublicObjectStorage().publicUrl(objectKey);
    } catch {
      return null;
    }
  }

  private async loadPublicMediaByIds(ids: string[]): Promise<Map<string, PublicProductMedia>> {
    if (!this.db || ids.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(mediaAssets)
      .where(and(inArray(mediaAssets.id, ids), eq(mediaAssets.visibility, "public")));
    const byId = new Map<string, PublicProductMedia>();
    for (const row of rows) {
      const media = toPublicMedia(this.publicUrl(row.objectKey), row.altText);
      if (media) byId.set(row.id, media);
    }
    return byId;
  }

  private async loadPublicMediaByPublicIds(
    publicIds: string[],
  ): Promise<Map<string, PublicProductMedia>> {
    if (!this.db || publicIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(mediaAssets)
      .where(and(inArray(mediaAssets.publicId, publicIds), eq(mediaAssets.visibility, "public")));
    const byPublicId = new Map<string, PublicProductMedia>();
    for (const row of rows) {
      const media = toPublicMedia(this.publicUrl(row.objectKey), row.altText);
      if (media) byPublicId.set(row.publicId, media);
    }
    return byPublicId;
  }

  private async loadStartingPrices(
    productIds: string[],
    options: ProductLocaleOptions,
  ): Promise<Map<string, PublicStartingPrice | null>> {
    const result = new Map<string, PublicStartingPrice | null>();
    if (!this.db || productIds.length === 0) return result;

    const planRows = await this.db
      .select()
      .from(plans)
      .where(and(inArray(plans.productId, productIds), eq(plans.status, "active")));
    if (planRows.length === 0) {
      for (const id of productIds) result.set(id, null);
      return result;
    }

    const priceRows = await this.db
      .select()
      .from(prices)
      .where(
        and(
          inArray(
            prices.planId,
            planRows.map((row) => row.id),
          ),
          eq(prices.isActive, true),
        ),
      );

    const pricesByProduct = new Map<string, ReturnType<typeof mapPrice>[]>();
    for (const plan of planRows) {
      const list = pricesByProduct.get(plan.productId) ?? [];
      for (const price of priceRows) {
        if (price.planId === plan.id) list.push(mapPrice(price));
      }
      pricesByProduct.set(plan.productId, list);
    }

    for (const productId of productIds) {
      const selected = selectDisplayPrice(pricesByProduct.get(productId) ?? [], {
        currency: options.market?.currency,
        region: options.market?.region,
        defaultCurrency: DEFAULT_CURRENCY,
      });
      result.set(
        productId,
        selected
          ? {
              amountMinor: selected.amountMinor,
              currency: selected.currency,
              interval: selected.interval,
            }
          : null,
      );
    }
    return result;
  }

  private async extrasForProducts(
    rows: Array<typeof products.$inferSelect>,
    translations: Array<typeof productTranslations.$inferSelect>,
    options: ProductLocaleOptions,
  ) {
    const iconIds = rows.map((row) => row.iconMediaId).filter((id): id is string => Boolean(id));
    const galleryIds = rows.flatMap((row) => parseGalleryMediaPublicIds(row.metadata));
    const coverPublicIds = rows
      .map((row) => parseCoverMediaPublicId(row.metadata as Record<string, unknown>))
      .filter((id): id is string => Boolean(id));
    const [icons, gallery, covers, starting] = await Promise.all([
      this.loadPublicMediaByIds(iconIds),
      this.loadPublicMediaByPublicIds(galleryIds),
      this.loadPublicMediaByPublicIds(coverPublicIds),
      this.loadStartingPrices(
        rows.map((row) => row.id),
        options,
      ),
    ]);

    const extras = new Map<
      string,
      {
        availableLocales: string[];
        icon: PublicProductMedia | null;
        cover: PublicProductMedia | null;
        gallery: PublicProductMedia[];
        startingPrice: PublicStartingPrice | null;
      }
    >();
    for (const product of rows) {
      const galleryPublicIds = parseGalleryMediaPublicIds(product.metadata);
      const coverPublicId = parseCoverMediaPublicId(product.metadata as Record<string, unknown>);
      extras.set(product.id, {
        availableLocales: availableLocalesOf(
          translations.filter((t) => t.productId === product.id),
        ),
        icon: product.iconMediaId ? (icons.get(product.iconMediaId) ?? null) : null,
        cover: coverPublicId ? (covers.get(coverPublicId) ?? null) : null,
        gallery: galleryPublicIds
          .map((id) => gallery.get(id))
          .filter((item): item is PublicProductMedia => Boolean(item)),
        startingPrice: starting.get(product.id) ?? null,
      });
    }
    return extras;
  }

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

    const extras = await this.extrasForProducts(rows, translations, options);

    return rows
      .map((product) => {
        const productTranslationsForRow = translations.filter((t) => t.productId === product.id);
        const translation = requireLocaleRow(productTranslationsForRow, options.locale);
        if (!translation) return null;
        const marketing = parseProductMarketingMetadata(product.metadata);
        return mapProductSummary(product, translation, extras.get(product.id)!, marketing);
      })
      .filter((row): row is PublicProductSummary => row !== null);
  }

  async getPublicProductBySlug(
    slug: string,
    options: ProductLocaleOptions,
  ): Promise<PublicProductDetail | null> {
    return this.getProductDetailBySlug(slug, options, { activeOnly: true });
  }

  async resolveProductIdBySlug(slug: string): Promise<string | null> {
    if (!this.db) return null;
    const [row] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    return row?.id ?? null;
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

    const translation = requireLocaleRow(translations, options.locale);
    if (!translation) return null;

    const productPlans = await this.loadPlansForProduct([product.id], options, mode.activeOnly);
    const planBundle = productPlans.get(product.id) ?? [];
    const extras = await this.extrasForProducts([product], translations, options);

    const marketing = parseProductMarketingMetadata(product.metadata);

    return {
      ...mapProductSummary(product, translation, extras.get(product.id)!, marketing),
      content: translation.content,
      marketing,
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
