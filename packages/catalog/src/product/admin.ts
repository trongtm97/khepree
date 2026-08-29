import { count, eq } from "drizzle-orm";
import {
  countFinancialRefs,
  createDrizzleAuditService,
  createPublicId,
  featureTranslations,
  features,
  getDb,
  planFeatures,
  planTranslations,
  plans,
  prices,
  productTranslations,
  products,
  type AuditService,
  type Database,
  type FeatureValueType,
} from "@khepree/db";
import type { PlanBillingType, PlanStatus, ProductStatus } from "./types";

export class CatalogError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
  }
}

export function isCatalogError(error: unknown): error is CatalogError {
  return error instanceof CatalogError;
}

export function rejectIfReferenced(countValue: number, label: string): void {
  if (countValue > 0) {
    throw new CatalogError(
      "IN_USE",
      `Cannot delete ${label} referenced by financial history. Archive or retire instead.`,
    );
  }
}

export class CatalogAdminService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async createProduct(input: {
    slug: string;
    nameEn: string;
    nameVi?: string;
    actorUserId?: string | null;
  }) {
    const slug = input.slug.trim().toLowerCase();
    if (!slug || !input.nameEn.trim()) {
      throw new CatalogError("INVALID_INPUT", "Slug and English name are required");
    }
    const [row] = await this.db
      .insert(products)
      .values({
        publicId: createPublicId("prod"),
        slug,
        status: "draft",
        platformCapabilities: [],
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Could not create product");
    await this.db.insert(productTranslations).values({
      productId: row.id,
      locale: "en",
      name: input.nameEn.trim(),
    });
    if (input.nameVi?.trim()) {
      await this.db.insert(productTranslations).values({
        productId: row.id,
        locale: "vi",
        name: input.nameVi.trim(),
      });
    }
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.create",
      resourceType: "product",
      resourceId: row.publicId,
    });
    return row;
  }

  async setProductStatus(input: {
    productId: string;
    status: ProductStatus;
    actorUserId?: string | null;
  }) {
    const [row] = await this.db
      .update(products)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(products.id, input.productId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Product not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.status",
      resourceType: "product",
      resourceId: row.publicId,
      metadata: { status: input.status },
    });
    return row;
  }

  async deleteProduct(input: { productId: string; actorUserId?: string | null }) {
    const refs = await countFinancialRefs({ productId: input.productId }, this.db);
    rejectIfReferenced(refs, "product");
    const [row] = await this.db
      .delete(products)
      .where(eq(products.id, input.productId))
      .returning({ publicId: products.publicId });
    if (!row) throw new CatalogError("NOT_FOUND", "Product not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.delete",
      resourceType: "product",
      resourceId: row.publicId,
    });
  }

  async createPlan(input: {
    productId: string;
    slug: string;
    billingType: PlanBillingType;
    nameEn: string;
    nameVi?: string;
    actorUserId?: string | null;
  }) {
    const [row] = await this.db
      .insert(plans)
      .values({
        publicId: createPublicId("plan"),
        productId: input.productId,
        slug: input.slug.trim(),
        billingType: input.billingType,
        status: "draft",
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Could not create plan");
    await this.db.insert(planTranslations).values({
      planId: row.id,
      locale: "en",
      name: input.nameEn.trim(),
    });
    if (input.nameVi?.trim()) {
      await this.db.insert(planTranslations).values({
        planId: row.id,
        locale: "vi",
        name: input.nameVi.trim(),
      });
    }
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.plan.create",
      resourceType: "plan",
      resourceId: row.publicId,
    });
    return row;
  }

  async setPlanStatus(input: { planId: string; status: PlanStatus; actorUserId?: string | null }) {
    const [row] = await this.db
      .update(plans)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(plans.id, input.planId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Plan not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.plan.status",
      resourceType: "plan",
      resourceId: row.publicId,
      metadata: { status: input.status },
    });
    return row;
  }

  async deletePlan(input: { planId: string; actorUserId?: string | null }) {
    const refs = await countFinancialRefs({ planId: input.planId }, this.db);
    rejectIfReferenced(refs, "plan");
    const [row] = await this.db
      .delete(plans)
      .where(eq(plans.id, input.planId))
      .returning({ publicId: plans.publicId });
    if (!row) throw new CatalogError("NOT_FOUND", "Plan not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.plan.delete",
      resourceType: "plan",
      resourceId: row.publicId,
    });
  }

  async createFeature(input: {
    key: string;
    valueType: FeatureValueType;
    nameEn: string;
    nameVi?: string;
    actorUserId?: string | null;
  }) {
    const [row] = await this.db
      .insert(features)
      .values({ key: input.key.trim(), valueType: input.valueType })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Could not create feature");
    await this.db.insert(featureTranslations).values({
      featureId: row.id,
      locale: "en",
      name: input.nameEn.trim(),
    });
    if (input.nameVi?.trim()) {
      await this.db.insert(featureTranslations).values({
        featureId: row.id,
        locale: "vi",
        name: input.nameVi.trim(),
      });
    }
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.feature.create",
      resourceType: "feature",
      resourceId: row.key,
    });
    return row;
  }

  async deleteFeature(input: { featureId: string; actorUserId?: string | null }) {
    const [used] = await this.db
      .select({ n: count() })
      .from(planFeatures)
      .where(eq(planFeatures.featureId, input.featureId));
    const n = typeof used?.n === "number" ? used.n : Number(used?.n ?? 0);
    if (n > 0) {
      throw new CatalogError("IN_USE", "Feature is attached to a plan. Detach it first.");
    }
    const [row] = await this.db
      .delete(features)
      .where(eq(features.id, input.featureId))
      .returning({ key: features.key });
    if (!row) throw new CatalogError("NOT_FOUND", "Feature not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.feature.delete",
      resourceType: "feature",
      resourceId: row.key,
    });
  }

  async createPrice(input: {
    planId: string;
    currency: string;
    amountMinor: bigint;
    interval?: string | null;
    region?: string | null;
    actorUserId?: string | null;
  }) {
    const [row] = await this.db
      .insert(prices)
      .values({
        publicId: createPublicId("price"),
        planId: input.planId,
        currency: input.currency.trim().toUpperCase(),
        amountMinor: input.amountMinor,
        interval: input.interval ?? null,
        region: input.region ?? null,
        isActive: true,
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Could not create price");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.price.create",
      resourceType: "price",
      resourceId: row.publicId,
    });
    return row;
  }

  async setPriceActive(input: { priceId: string; isActive: boolean; actorUserId?: string | null }) {
    const [row] = await this.db
      .update(prices)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(prices.id, input.priceId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Price not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.price.status",
      resourceType: "price",
      resourceId: row.publicId,
      metadata: { isActive: input.isActive },
    });
    return row;
  }

  async deletePrice(input: { priceId: string; actorUserId?: string | null }) {
    const refs = await countFinancialRefs({ priceId: input.priceId }, this.db);
    rejectIfReferenced(refs, "price");
    const [row] = await this.db
      .delete(prices)
      .where(eq(prices.id, input.priceId))
      .returning({ publicId: prices.publicId });
    if (!row) throw new CatalogError("NOT_FOUND", "Price not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.price.delete",
      resourceType: "price",
      resourceId: row.publicId,
    });
  }

  async upsertProductTranslation(input: {
    productId: string;
    locale: "en" | "vi";
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    actorUserId?: string | null;
  }) {
    await this.db
      .insert(productTranslations)
      .values({
        productId: input.productId,
        locale: input.locale,
        name: input.name.trim(),
        shortDescription: input.shortDescription ?? null,
        description: input.description ?? null,
      })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: {
          name: input.name.trim(),
          shortDescription: input.shortDescription ?? null,
          description: input.description ?? null,
          updatedAt: new Date(),
        },
      });
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.translate",
      resourceType: "product",
      resourceId: input.productId,
      metadata: { locale: input.locale },
    });
  }
}

export function createCatalogAdminService(db?: Database | null, audit?: AuditService): CatalogAdminService {
  const resolved = db ?? getDb();
  if (!resolved) throw new CatalogError("NOT_CONFIGURED", "Database is not configured");
  return new CatalogAdminService(
    resolved,
    audit ?? createDrizzleAuditService(resolved),
  );
}
