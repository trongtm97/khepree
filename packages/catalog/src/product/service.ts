import { and, asc, eq, inArray } from "drizzle-orm";
import {
  features,
  getDb,
  planFeatures,
  plans,
  prices,
  products,
  type Database,
  type ProductPlatform,
} from "@khepree/db";
import { mapPlanFeatureRow } from "./features";
import { parseProductMarketingMetadata } from "./metadata";
import { resolvePricingDisplayMode } from "./pricing";
import type {
  PricingProductGroup,
  PublicPlan,
  PublicProductDetail,
  PublicProductSummary,
} from "./types";

function mapProductSummary(row: typeof products.$inferSelect): PublicProductSummary {
  return {
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    description: row.description,
    platforms: row.platformCapabilities as ProductPlatform[],
    status: row.status,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

function mapPrice(row: typeof prices.$inferSelect) {
  return {
    publicId: row.publicId,
    currency: row.currency,
    region: row.region,
    amountMinor: row.amountMinor,
    interval: row.interval,
    isActive: row.isActive,
  };
}

export class ProductService {
  constructor(private readonly db: Database | null = getDb()) {}

  async listPublicProducts(): Promise<PublicProductSummary[]> {
    if (!this.db) return [];

    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(asc(products.name));

    return rows.map(mapProductSummary);
  }

  async getPublicProductBySlug(slug: string): Promise<PublicProductDetail | null> {
    if (!this.db) return null;

    const [product] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.status, "active")))
      .limit(1);

    if (!product) return null;

    const productPlans = await this.loadActivePlans([product.id]);
    const planBundle = productPlans.get(product.id) ?? [];

    return {
      ...mapProductSummary(product),
      content: product.content,
      marketing: parseProductMarketingMetadata(product.metadata),
      plans: planBundle,
    };
  }

  async listPricingGroups(): Promise<PricingProductGroup[]> {
    if (!this.db) return [];

    const productRows = await this.db
      .select()
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(asc(products.name));

    if (productRows.length === 0) return [];

    const planMap = await this.loadActivePlans(productRows.map((row) => row.id));

    return productRows
      .map((row) => ({
        product: mapProductSummary(row),
        plans: planMap.get(row.id) ?? [],
      }))
      .filter((group) => group.plans.length > 0);
  }

  async listCatalogProducts(): Promise<PublicProductSummary[]> {
    return this.listPublicProducts();
  }

  private async loadActivePlans(productIds: string[]): Promise<Map<string, PublicPlan[]>> {
    if (!this.db || productIds.length === 0) return new Map();

    const planRows = await this.db
      .select()
      .from(plans)
      .where(and(inArray(plans.productId, productIds), eq(plans.status, "active")))
      .orderBy(asc(plans.name));

    if (planRows.length === 0) return new Map();

    const planIds = planRows.map((row) => row.id);
    const [featureRows, priceRows] = await Promise.all([
      this.db
        .select({
          planId: planFeatures.planId,
          key: features.key,
          name: features.name,
          valueType: planFeatures.valueType,
          booleanValue: planFeatures.booleanValue,
          integerValue: planFeatures.integerValue,
          stringValue: planFeatures.stringValue,
        })
        .from(planFeatures)
        .innerJoin(features, eq(planFeatures.featureId, features.id))
        .where(inArray(planFeatures.planId, planIds)),
      this.db
        .select()
        .from(prices)
        .where(and(inArray(prices.planId, planIds), eq(prices.isActive, true)))
        .orderBy(asc(prices.currency)),
    ]);

    const featuresByPlan = new Map<string, PublicPlan["features"]>();
    for (const row of featureRows) {
      const list = featuresByPlan.get(row.planId) ?? [];
      list.push(mapPlanFeatureRow(row));
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
      const list = byProduct.get(row.productId) ?? [];
      list.push({
        publicId: row.publicId,
        slug: row.slug,
        name: row.name,
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
