import { eq } from "drizzle-orm";
import {
  coercePlanFeatureRow,
  features,
  planFeatures,
  plans,
  products,
  type Database,
} from "@khepree/db";
import type { CatalogReader, CatalogSnapshot, FeatureSnapshotEntry } from "./types";

export class DrizzleCatalogReader implements CatalogReader {
  constructor(private readonly db: Database) {}

  async getProductSlug(productId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    return row?.slug ?? null;
  }

  async getPlanSnapshot(planId: string): Promise<CatalogSnapshot | null> {
    const [plan] = await this.db
      .select({
        planId: plans.id,
        planSlug: plans.slug,
        productId: plans.productId,
        productSlug: products.slug,
      })
      .from(plans)
      .innerJoin(products, eq(plans.productId, products.id))
      .where(eq(plans.id, planId))
      .limit(1);
    if (!plan) return null;

    const rows = await this.db
      .select({
        key: features.key,
        valueType: features.valueType,
        booleanValue: planFeatures.booleanValue,
        integerValue: planFeatures.integerValue,
        stringValue: planFeatures.stringValue,
      })
      .from(planFeatures)
      .innerJoin(features, eq(planFeatures.featureId, features.id))
      .where(eq(planFeatures.planId, planId));

    const featureEntries: FeatureSnapshotEntry[] = rows.map((row) => ({
      key: row.key,
      value: coercePlanFeatureRow(row.valueType, {
        booleanValue: row.booleanValue,
        integerValue: row.integerValue,
        stringValue: row.stringValue,
      }),
    }));

    return {
      productId: plan.productId,
      productSlug: plan.productSlug,
      planId: plan.planId,
      planSlug: plan.planSlug,
      features: featureEntries,
    };
  }
}

export class MemoryCatalogReader implements CatalogReader {
  constructor(private readonly snapshots: Map<string, CatalogSnapshot>) {}

  async getPlanSnapshot(planId: string): Promise<CatalogSnapshot | null> {
    return this.snapshots.get(planId) ?? null;
  }

  async getProductSlug(productId: string): Promise<string | null> {
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.productId === productId) return snapshot.productSlug;
    }
    return null;
  }
}
