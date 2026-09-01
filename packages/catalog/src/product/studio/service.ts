import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  createPublicId,
  featureTranslations,
  features,
  mediaAssets,
  planFeatures,
  planTranslations,
  plans,
  prices,
  productTranslations,
  products,
  softwareReleases,
  type AuditService,
  type Database,
  type FeatureValueType,
  type LicensingMode,
  type ProductPlatform,
} from "@khepree/db";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_DEVICE_TRANSFER_LIMIT, DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS } from "@khepree/config";
import { parseMoneyMinor } from "@khepree/types";
import { formatPriceAmount } from "../pricing";
import { normalizePlatformCapabilities, normalizeProductMetadata, parseOperatingSystems } from "../metadata";
import {
  deriveSeoFields,
  parseProductType,
  productTypeToLicensingMode,
  productTypeToPlatforms,
  resolveAccessTerm,
  STUDIO_FEATURE_KEYS,
  suggestPlanSlug,
} from "../studio-field-policy";
import {
  assertUniqueDesktopClientId,
  assertUniqueDesktopProtocol,
  assertUniqueProductCode,
  checkProductIdentityLocked,
  loadDesktopClientForProduct,
  resolveProductTechnicalFields,
  syncDesktopClient,
} from "./technical-persist";
import {
  deriveDesktopCallbackUri,
  parseAccessFeatureKey,
  parseDesktopProtocol,
  parseProductCode,
  suggestAccessFeatureKey,
  suggestInternalPlanCode,
  suggestProductCode,
} from "../technical-identity";
import { createProductPreviewToken } from "../preview-token";
import { suggestProductSlug } from "../slug";
import { CatalogError } from "../admin";
import type { PlanBillingType, PlanStatus } from "../types";
import { computeProductReadiness } from "./readiness";
import type {
  ProductStudioSnapshot,
  SaveStudioDraftInput,
  SaveStudioDraftResult,
  StudioFeatureOption,
  StudioListRow,
  StudioPlan,
} from "./types";

function pickName(
  rows: Array<{ locale: string; name: string }>,
  locale: string,
): string | null {
  return rows.find((row) => row.locale === locale)?.name ?? null;
}

export class ProductStudioService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly previewSecret: string,
  ) {}

  async createDraft(input: {
    nameVi: string;
    nameEn?: string;
    slug?: string;
    licensingMode?: LicensingMode;
    platformCapabilities?: ProductPlatform[];
    actorUserId?: string | null;
  }) {
    const nameVi = input.nameVi.trim();
    if (!nameVi) throw new CatalogError("INVALID_INPUT", "Tên tiếng Việt là bắt buộc");
    const slug = (input.slug?.trim() || suggestProductSlug(nameVi)).toLowerCase();
    if (!slug) throw new CatalogError("INVALID_INPUT", "Slug không hợp lệ");

    const [existing] = await this.db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (existing) throw new CatalogError("CONFLICT", "Slug đã tồn tại");

    const nameEn = input.nameEn?.trim() || nameVi;
    const [row] = await this.db
      .insert(products)
      .values({
        publicId: createPublicId("prod"),
        slug,
        status: "draft",
        licensingMode: input.licensingMode ?? "LICENSE_KEY_DEVICE",
        platformCapabilities: input.platformCapabilities ?? [],
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Không thể tạo sản phẩm");

    await this.db.insert(productTranslations).values([
      { productId: row.id, locale: "vi", name: nameVi },
      { productId: row.id, locale: "en", name: nameEn },
    ]);

    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.create",
      resourceType: "product",
      resourceId: row.publicId,
    });
    return row;
  }

  async getSnapshot(productId: string): Promise<ProductStudioSnapshot | null> {
    const [product] = await this.db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return null;

    const translations = await this.db
      .select()
      .from(productTranslations)
      .where(eq(productTranslations.productId, productId));

    const planRows = await this.db
      .select()
      .from(plans)
      .where(eq(plans.productId, productId))
      .orderBy(asc(plans.slug));

    const planIds = planRows.map((row) => row.id);
    const [planTranslationRows, priceRows, planFeatureRows, allFeatures] = await Promise.all([
      planIds.length
        ? this.db.select().from(planTranslations).where(inArray(planTranslations.planId, planIds))
        : Promise.resolve([]),
      planIds.length
        ? this.db.select().from(prices).where(inArray(prices.planId, planIds)).orderBy(desc(prices.createdAt))
        : Promise.resolve([]),
      planIds.length
        ? this.db
            .select({
              planId: planFeatures.planId,
              featureId: features.id,
              key: features.key,
              valueType: features.valueType,
              booleanValue: planFeatures.booleanValue,
              integerValue: planFeatures.integerValue,
              stringValue: planFeatures.stringValue,
            })
            .from(planFeatures)
            .innerJoin(features, eq(planFeatures.featureId, features.id))
            .where(inArray(planFeatures.planId, planIds))
        : Promise.resolve([]),
      this.db.select().from(features).orderBy(asc(features.key)),
    ]);

    const featureIds = [...new Set(planFeatureRows.map((row) => row.featureId))];
    const featureTranslationRows =
      featureIds.length > 0
        ? await this.db
            .select()
            .from(featureTranslations)
            .where(inArray(featureTranslations.featureId, featureIds))
        : allFeatures.length > 0
          ? await this.db
              .select()
              .from(featureTranslations)
              .where(inArray(featureTranslations.featureId, allFeatures.map((f) => f.id)))
          : [];

    let iconMediaPublicId: string | null = null;
    if (product.iconMediaId) {
      const [icon] = await this.db
        .select({ publicId: mediaAssets.publicId })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, product.iconMediaId))
        .limit(1);
      iconMediaPublicId = icon?.publicId ?? null;
    }

    const [publishedReleaseRow] = await this.db
      .select({ n: count() })
      .from(softwareReleases)
      .where(
        and(eq(softwareReleases.productId, productId), eq(softwareReleases.status, "published")),
      );

    const studioPlans: StudioPlan[] = planRows.map((plan) => {
      const planTrans = planTranslationRows.filter((t) => t.planId === plan.id);
      const planPrices = priceRows.filter((p) => p.planId === plan.id);
      const pfRows = planFeatureRows.filter((pf) => pf.planId === plan.id);
      const transferMax = pfRows.find((f) => f.key === STUDIO_FEATURE_KEYS.deviceTransfersMax)?.integerValue;
      const transferWindow = pfRows.find((f) => f.key === STUDIO_FEATURE_KEYS.deviceTransfersWindowDays)?.integerValue;
      const hasTransferFeatures = pfRows.some(
        (f) =>
          f.key === STUDIO_FEATURE_KEYS.deviceTransfersMax ||
          f.key === STUDIO_FEATURE_KEYS.deviceTransfersWindowDays,
      );
      return {
        id: plan.id,
        publicId: plan.publicId,
        slug: plan.slug,
        internalCode: plan.internalCode,
        billingType: plan.billingType,
        accessTermDays: plan.accessTermDays,
        status: plan.status,
        nameVi: pickName(planTrans, "vi"),
        nameEn: pickName(planTrans, "en"),
        prices: planPrices.map((price) => ({
          id: price.id,
          publicId: price.publicId,
          currency: price.currency,
          region: price.region,
          amountMinor: price.amountMinor,
          interval: price.interval,
          isActive: price.isActive,
        })),
        features: pfRows.map((pf) => {
          const ft = featureTranslationRows.filter((t) => t.featureId === pf.featureId);
          const label = pickName(ft, DEFAULT_LOCALE) ?? pickName(ft, "en") ?? pf.key;
          return {
            featureId: pf.featureId,
            key: pf.key,
            name: label,
            valueType: pf.valueType,
            booleanValue: pf.booleanValue,
            integerValue: pf.integerValue,
            stringValue: pf.stringValue,
          };
        }),
        useDefaultDevicePolicy: !hasTransferFeatures,
        selfServiceDeviceRemoval: transferMax === null || transferMax === undefined ? true : transferMax > 0,
        deviceTransferMax: transferMax ?? null,
        deviceTransferWindowDays: transferWindow ?? null,
      };
    });

    const metadata = normalizeProductMetadata(product.metadata);
    const identity = await checkProductIdentityLocked(this.db, productId);
    const desktopClient = await loadDesktopClientForProduct(this.db, productId);

    return {
      id: product.id,
      publicId: product.publicId,
      slug: product.slug,
      status: product.status,
      licensingMode: product.licensingMode,
      platformCapabilities: normalizePlatformCapabilities(product.platformCapabilities),
      iconMediaId: product.iconMediaId,
      iconMediaPublicId,
      metadata,
      productCode: parseProductCode(metadata),
      accessFeatureKey: parseAccessFeatureKey(metadata),
      desktopProtocol: parseDesktopProtocol(metadata),
      desktopClientId: desktopClient?.clientId ?? null,
      desktopCallbackUri: desktopClient?.callbackUri ?? null,
      identityLocked: identity.locked,
      identityLockReason: identity.reason,
      updatedAt: product.updatedAt,
      translations: translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        shortDescription: t.shortDescription,
        description: t.description,
        content: t.content,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
      })),
      plans: studioPlans,
      publishedReleaseCount: Number(publishedReleaseRow?.n ?? 0),
    };
  }

  async listSummaries(input: { q?: string; page?: number; pageSize?: number }): Promise<StudioListRow[]> {
    const pageSize = input.pageSize ?? 50;
    const page = input.page ?? 1;
    const offset = Math.max(0, page - 1) * pageSize;
    const term = input.q?.trim();

    let productIds: string[] | undefined;
    if (term) {
      const matches = await this.db
        .select({ id: products.id })
        .from(products)
        .leftJoin(productTranslations, eq(productTranslations.productId, products.id))
        .where(or(ilike(products.slug, `%${term}%`), ilike(productTranslations.name, `%${term}%`)))
        .groupBy(products.id);
      productIds = matches.map((row) => row.id);
      if (productIds.length === 0) return [];
    }

    const rows = await this.db
      .select()
      .from(products)
      .where(productIds ? inArray(products.id, productIds) : undefined)
      .orderBy(desc(products.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const result: StudioListRow[] = [];
    for (const product of rows) {
      const snapshot = await this.getSnapshot(product.id);
      if (!snapshot) continue;
      const readiness = computeProductReadiness(snapshot);
      const vi = snapshot.translations.find((t) => t.locale === "vi");
      const en = snapshot.translations.find((t) => t.locale === "en");
      const primaryPlan =
        snapshot.plans.find((p) => p.status === "active") ?? snapshot.plans[0] ?? null;
      const primaryPrice = primaryPlan?.prices.find((p) => p.isActive) ?? primaryPlan?.prices[0] ?? null;
      result.push({
        id: product.id,
        publicId: product.publicId,
        slug: product.slug,
        status: product.status,
        nameVi: vi?.name ?? null,
        nameEn: en?.name ?? null,
        iconMediaPublicId: snapshot.iconMediaPublicId,
        productType: parseProductType(snapshot.metadata),
        platformCapabilities: snapshot.platformCapabilities,
        planCount: snapshot.plans.filter((p) => p.status !== "archived").length,
        latestReleaseVersion: null,
        updatedAt: product.updatedAt,
        primaryPlanLabel: primaryPlan ? primaryPlan.nameVi ?? primaryPlan.slug : null,
        primaryPriceLabel: primaryPrice
          ? formatPriceAmount(primaryPrice.amountMinor, primaryPrice.currency, DEFAULT_LOCALE)
          : null,
        seoOk: readiness.items.find((i) => i.id === "seo")?.ok ?? false,
        readiness,
      });
    }
    return result;
  }

  listFeatureOptions(): Promise<StudioFeatureOption[]> {
    return this.loadFeatureOptions();
  }

  private async loadFeatureOptions(): Promise<StudioFeatureOption[]> {
    const rows = await this.db.select().from(features).orderBy(asc(features.key));
    if (rows.length === 0) return [];
    const translations = await this.db
      .select()
      .from(featureTranslations)
      .where(inArray(featureTranslations.featureId, rows.map((r) => r.id)));
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      valueType: row.valueType,
      nameVi: pickName(translations.filter((t) => t.featureId === row.id), "vi"),
      nameEn: pickName(translations.filter((t) => t.featureId === row.id), "en"),
    }));
  }

  async updateOverview(input: {
    productId: string;
    slug?: string;
    licensingMode?: LicensingMode;
    platformCapabilities?: ProductPlatform[];
    iconMediaPublicId?: string | null;
    operatingSystems?: string[];
    actorUserId?: string | null;
  }) {
    const [existing] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!existing) throw new CatalogError("NOT_FOUND", "Product not found");

    let iconMediaId: string | null | undefined;
    if (input.iconMediaPublicId !== undefined) {
      if (input.iconMediaPublicId === null || input.iconMediaPublicId === "") {
        iconMediaId = null;
      } else {
        const [media] = await this.db
          .select({ id: mediaAssets.id })
          .from(mediaAssets)
          .where(eq(mediaAssets.publicId, input.iconMediaPublicId))
          .limit(1);
        if (!media) throw new CatalogError("NOT_FOUND", "Media không tồn tại");
        iconMediaId = media.id;
      }
    }

    const metadata =
      input.operatingSystems !== undefined
        ? {
            ...normalizeProductMetadata(existing.metadata),
            operatingSystems: parseOperatingSystems({ operatingSystems: input.operatingSystems }),
          }
        : undefined;

    const [row] = await this.db
      .update(products)
      .set({
        ...(input.slug ? { slug: input.slug.trim().toLowerCase() } : {}),
        ...(input.licensingMode ? { licensingMode: input.licensingMode } : {}),
        ...(input.platformCapabilities ? { platformCapabilities: input.platformCapabilities } : {}),
        ...(iconMediaId !== undefined ? { iconMediaId } : {}),
        ...(metadata ? { metadata } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.productId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Product not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.update",
      resourceType: "product",
      resourceId: row.publicId,
    });
    return row;
  }

  async upsertTranslation(input: {
    productId: string;
    locale: "vi" | "en";
    name?: string;
    shortDescription?: string | null;
    description?: string | null;
    content?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    actorUserId?: string | null;
  }) {
    const existing = await this.db
      .select()
      .from(productTranslations)
      .where(and(eq(productTranslations.productId, input.productId), eq(productTranslations.locale, input.locale)))
      .limit(1);
    const current = existing[0];
    const name = input.name?.trim() ?? current?.name;
    if (!name?.trim()) throw new CatalogError("INVALID_INPUT", "Tên không được trống");

    await this.db
      .insert(productTranslations)
      .values({
        productId: input.productId,
        locale: input.locale,
        name: name.trim(),
        shortDescription: input.shortDescription ?? current?.shortDescription ?? null,
        description: input.description ?? current?.description ?? null,
        content: input.content ?? current?.content ?? null,
        seoTitle: input.seoTitle ?? current?.seoTitle ?? null,
        seoDescription: input.seoDescription ?? current?.seoDescription ?? null,
      })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: {
          name: name.trim(),
          shortDescription: input.shortDescription ?? current?.shortDescription ?? null,
          description: input.description ?? current?.description ?? null,
          content: input.content ?? current?.content ?? null,
          seoTitle: input.seoTitle ?? current?.seoTitle ?? null,
          seoDescription: input.seoDescription ?? current?.seoDescription ?? null,
          updatedAt: new Date(),
        },
      });

    await this.db.update(products).set({ updatedAt: new Date() }).where(eq(products.id, input.productId));
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.translate",
      resourceType: "product",
      resourceId: input.productId,
      metadata: { locale: input.locale },
    });
  }

  async updateMarketingMetadata(input: {
    productId: string;
    marketing: Record<string, unknown>;
    actorUserId?: string | null;
  }) {
    const snapshot = await this.getSnapshot(input.productId);
    if (!snapshot) throw new CatalogError("NOT_FOUND", "Product not found");
    const metadata = { ...snapshot.metadata, marketing: input.marketing };
    const [row] = await this.db
      .update(products)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(products.id, input.productId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Product not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.metadata",
      resourceType: "product",
      resourceId: row.publicId,
    });
  }

  async savePlan(input: {
    productId: string;
    planId?: string;
    slug: string;
    internalCode?: string | null;
    billingType: PlanBillingType;
    accessTermDays?: number | null;
    nameVi: string;
    nameEn?: string;
    status?: PlanStatus;
    actorUserId?: string | null;
  }) {
    const nameVi = input.nameVi.trim();
    if (!nameVi) throw new CatalogError("INVALID_INPUT", "Tên gói (VI) là bắt buộc");
    const nameEn = input.nameEn?.trim() || nameVi;

    if (input.planId) {
      const [plan] = await this.db
        .update(plans)
        .set({
          slug: input.slug.trim(),
          internalCode: input.internalCode ?? null,
          billingType: input.billingType,
          accessTermDays: input.accessTermDays ?? null,
          ...(input.status ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(plans.id, input.planId), eq(plans.productId, input.productId)))
        .returning();
      if (!plan) throw new CatalogError("NOT_FOUND", "Plan not found");
      await this.upsertPlanTranslation(plan.id, "vi", nameVi);
      await this.upsertPlanTranslation(plan.id, "en", nameEn);
      await this.audit.record({
        actorUserId: input.actorUserId ?? null,
        action: "catalog.plan.update",
        resourceType: "plan",
        resourceId: plan.publicId,
      });
      return plan;
    }

    const [plan] = await this.db
      .insert(plans)
      .values({
        publicId: createPublicId("plan"),
        productId: input.productId,
        slug: input.slug.trim(),
        internalCode: input.internalCode ?? null,
        billingType: input.billingType,
        accessTermDays: input.accessTermDays ?? null,
        status: input.status ?? "draft",
      })
      .returning();
    if (!plan) throw new CatalogError("CONFLICT", "Could not create plan");
    await this.upsertPlanTranslation(plan.id, "vi", nameVi);
    await this.upsertPlanTranslation(plan.id, "en", nameEn);
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.plan.create",
      resourceType: "plan",
      resourceId: plan.publicId,
    });
    return plan;
  }

  private async upsertPlanTranslation(planId: string, locale: string, name: string) {
    await this.db
      .insert(planTranslations)
      .values({ planId, locale, name })
      .onConflictDoUpdate({
        target: [planTranslations.planId, planTranslations.locale],
        set: { name, updatedAt: new Date() },
      });
  }

  async savePrice(input: {
    planId: string;
    priceId?: string;
    currency?: string;
    amountMajor: string;
    region?: string | null;
    interval?: string | null;
    isActive?: boolean;
    actorUserId?: string | null;
  }) {
    const currency = (input.currency ?? DEFAULT_CURRENCY).trim().toUpperCase();
    const amountMinor = parseMoneyMinor(input.amountMajor.trim());

    if (input.priceId) {
      const [row] = await this.db
        .update(prices)
        .set({
          currency,
          amountMinor,
          region: input.region ?? null,
          interval: input.interval ?? null,
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(prices.id, input.priceId))
        .returning();
      if (!row) throw new CatalogError("NOT_FOUND", "Price not found");
      await this.audit.record({
        actorUserId: input.actorUserId ?? null,
        action: "catalog.price.update",
        resourceType: "price",
        resourceId: row.publicId,
      });
      return row;
    }

    const [row] = await this.db
      .insert(prices)
      .values({
        publicId: createPublicId("price"),
        planId: input.planId,
        currency,
        amountMinor,
        region: input.region ?? null,
        interval: input.interval ?? null,
        isActive: input.isActive ?? true,
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

  async upsertPlanFeature(input: {
    planId: string;
    featureId: string;
    valueType: FeatureValueType;
    booleanValue?: boolean;
    integerValue?: number;
    stringValue?: string;
    actorUserId?: string | null;
  }) {
    const values =
      input.valueType === "boolean"
        ? { booleanValue: Boolean(input.booleanValue), integerValue: null, stringValue: null }
        : input.valueType === "integer"
          ? { booleanValue: null, integerValue: input.integerValue ?? 0, stringValue: null }
          : { booleanValue: null, integerValue: null, stringValue: input.stringValue ?? "" };

    await this.db
      .insert(planFeatures)
      .values({ planId: input.planId, featureId: input.featureId, ...values })
      .onConflictDoUpdate({
        target: [planFeatures.planId, planFeatures.featureId],
        set: { ...values, updatedAt: new Date() },
      });

    const [plan] = await this.db.select({ publicId: plans.publicId }).from(plans).where(eq(plans.id, input.planId)).limit(1);
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.plan.feature",
      resourceType: "plan",
      resourceId: plan?.publicId ?? input.planId,
      metadata: { featureId: input.featureId },
    });
  }

  async createFeature(input: {
    key: string;
    valueType: FeatureValueType;
    nameVi: string;
    nameEn?: string;
    actorUserId?: string | null;
  }) {
    const [row] = await this.db
      .insert(features)
      .values({ key: input.key.trim(), valueType: input.valueType })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Could not create feature");
    await this.db.insert(featureTranslations).values([
      { featureId: row.id, locale: "vi", name: input.nameVi.trim() },
      { featureId: row.id, locale: "en", name: (input.nameEn?.trim() || input.nameVi).trim() },
    ]);
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.feature.create",
      resourceType: "feature",
      resourceId: row.key,
    });
    return row;
  }

  async publish(productId: string, actorUserId?: string | null) {
    const snapshot = await this.getSnapshot(productId);
    if (!snapshot) throw new CatalogError("NOT_FOUND", "Product not found");
    const readiness = computeProductReadiness(snapshot);
    if (!readiness.ready) {
      const missing = readiness.items
        .filter((item) => item.required && !item.ok)
        .map((item) => item.label);
      throw new CatalogError(
        "INVALID_STATE",
        missing.length > 0
          ? `Chưa sẵn sàng xuất bản — thiếu: ${missing.join("; ")}`
          : `Chưa sẵn sàng xuất bản — còn ${readiness.blockingCount} mục bắt buộc`,
      );
    }

    await this.db
      .update(products)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(products.id, productId));

    const snapshotAfter = await this.getSnapshot(productId);
    if (snapshotAfter) {
      for (const plan of snapshotAfter.plans) {
        if (plan.status !== "active" && plan.prices.some((p) => p.isActive)) {
          await this.db.update(plans).set({ status: "active" }).where(eq(plans.id, plan.id));
        }
      }
    }

    const [row] = await this.db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!row) throw new CatalogError("NOT_FOUND", "Product not found");
    await this.audit.record({
      actorUserId: actorUserId ?? null,
      action: "catalog.product.publish",
      resourceType: "product",
      resourceId: row.publicId,
    });
    return row;
  }

  async archive(input: { productId: string; reason: string; actorUserId?: string | null }) {
    if (input.reason.trim().length < 3) {
      throw new CatalogError("INVALID_INPUT", "Lý do lưu trữ là bắt buộc");
    }
    const [row] = await this.db
      .update(products)
      .set({ status: "retired", updatedAt: new Date() })
      .where(eq(products.id, input.productId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Product not found");
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.product.archive",
      resourceType: "product",
      resourceId: row.publicId,
      metadata: { reason: input.reason.trim() },
    });
    return row;
  }

  async createEmptyDraft(actorUserId?: string | null) {
    return this.createDraft({
      nameVi: "Sản phẩm mới",
      actorUserId,
    });
  }

  async saveStudioDraft(input: SaveStudioDraftInput): Promise<SaveStudioDraftResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const snapshot = await this.getSnapshot(input.productId);
    if (!snapshot) {
      return { ok: false, errors: ["Không tìm thấy sản phẩm"], warnings };
    }

    const viInput = input.translations.find((t) => t.locale === "vi");
    const nameVi = viInput?.name?.trim() ?? snapshot.translations.find((t) => t.locale === "vi")?.name ?? "";
    let slug = input.slug?.trim().toLowerCase() || snapshot.slug;
    if (input.autoSlugFromName && nameVi) {
      slug = suggestProductSlug(nameVi);
    }
    if (slug !== snapshot.slug) {
      const [collision] = await this.db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);
      if (collision && collision.id !== input.productId) {
        errors.push(`Slug "${slug}" đã được sử dụng`);
      }
      if (snapshot.status === "active") {
        warnings.push("Sản phẩm đã xuất bản — đổi slug có thể gây broken URL nếu chưa cấu hình redirect");
      }
    }

    const productType = input.productType ?? parseProductType(snapshot.metadata);
    const licensingMode =
      input.licensingMode ?? (productType ? productTypeToLicensingMode(productType) : snapshot.licensingMode);
    const platformCapabilities = productType
      ? productTypeToPlatforms(productType)
      : snapshot.platformCapabilities;

    const metadata = { ...normalizeProductMetadata(snapshot.metadata) };
    if (input.productCategory !== undefined) {
      metadata.productCategory = input.productCategory;
    }
    if (input.productType !== undefined) {
      metadata.productType = input.productType;
    }
    if (input.coverMediaPublicId !== undefined) {
      if (input.coverMediaPublicId) metadata.coverMediaPublicId = input.coverMediaPublicId;
      else delete metadata.coverMediaPublicId;
    }
    if (input.galleryMediaPublicIds !== undefined) {
      metadata.galleryMediaPublicIds = input.galleryMediaPublicIds;
    }
    if (input.operatingSystems !== undefined) {
      metadata.operatingSystems = parseOperatingSystems({ operatingSystems: input.operatingSystems });
    }

    let recommendedPublicId = input.recommendedPlanPublicId ?? null;
    const recommendedFromPlans = input.plans.find((p) => p.recommended);
    if (recommendedFromPlans) {
      const existing = recommendedFromPlans.planId
        ? snapshot.plans.find((p) => p.id === recommendedFromPlans.planId)?.publicId
        : null;
      if (existing) recommendedPublicId = existing;
    }
    if (recommendedPublicId) metadata.recommendedPlanPublicId = recommendedPublicId;
    else delete metadata.recommendedPlanPublicId;

    const identityLock = await checkProductIdentityLocked(this.db, input.productId);
    const previousType = parseProductType(snapshot.metadata);
    if (
      previousType === "desktop-software" &&
      productType !== "desktop-software" &&
      identityLock.locked
    ) {
      errors.push("Không thể đổi loại sản phẩm — đã có phiên desktop, entitlement hoặc đơn hàng.");
    }

    let technical: ReturnType<typeof resolveProductTechnicalFields> | null = null;
    try {
      technical = resolveProductTechnicalFields({
        nameVi,
        metadata: snapshot.metadata,
        productType: productType ?? null,
        overrides: {
          productCode: identityLock.locked
            ? parseProductCode(snapshot.metadata) ?? undefined
            : input.productCode,
          accessFeatureKey: identityLock.locked
            ? parseAccessFeatureKey(snapshot.metadata) ?? undefined
            : input.accessFeatureKey,
          desktopClientId: identityLock.locked
            ? snapshot.desktopClientId ?? undefined
            : input.desktopClientId,
          desktopProtocol: identityLock.locked
            ? parseDesktopProtocol(snapshot.metadata) ?? undefined
            : input.desktopProtocol,
        },
        identityLocked: identityLock.locked,
      });
      await assertUniqueProductCode(this.db, technical.productCode, input.productId);
      if (technical.desktopProtocol) {
        await assertUniqueDesktopProtocol(this.db, technical.desktopProtocol, input.productId);
      }
      if (technical.desktopClientId) {
        await assertUniqueDesktopClientId(this.db, technical.desktopClientId, input.productId);
      }
      metadata.productCode = technical.productCode;
      metadata.accessFeatureKey = technical.accessFeatureKey;
      if (technical.desktopProtocol) metadata.desktopProtocol = technical.desktopProtocol;
      else delete metadata.desktopProtocol;
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : "Cấu hình technical identity không hợp lệ");
    }

    if (errors.length > 0) return { ok: false, errors, warnings };

    try {
      await this.updateOverview({
        productId: input.productId,
        slug,
        licensingMode,
        platformCapabilities,
        iconMediaPublicId: input.iconMediaPublicId,
        actorUserId: input.actorUserId,
      });
      await this.db
        .update(products)
        .set({ metadata, updatedAt: new Date() })
        .where(eq(products.id, input.productId));

      if (technical) {
        const existingClient = await loadDesktopClientForProduct(this.db, input.productId);
        const clientId =
          technical.desktopClientId ??
          existingClient?.clientId ??
          snapshot.desktopClientId ??
          "";
        const callbackUri =
          technical.desktopCallbackUri ?? existingClient?.callbackUri ?? snapshot.desktopCallbackUri ?? "";
        if (productType === "desktop-software" && clientId && callbackUri) {
          await syncDesktopClient(this.db, {
            productId: input.productId,
            displayName: nameVi,
            clientId,
            callbackUri,
            active: true,
          });
        } else if (productType !== "desktop-software") {
          const inactiveClient = await loadDesktopClientForProduct(this.db, input.productId);
          if (inactiveClient) {
            await syncDesktopClient(this.db, {
              productId: input.productId,
              displayName: nameVi,
              clientId: inactiveClient.clientId,
              callbackUri: inactiveClient.callbackUri ?? deriveDesktopCallbackUri("inactive"),
              active: false,
            });
          }
        }
      }

      for (const tr of input.translations) {
        const current = snapshot.translations.find((t) => t.locale === tr.locale);
        const name = tr.name?.trim() || current?.name;
        if (!name?.trim()) continue;

        let seoTitle = tr.seoTitle ?? current?.seoTitle ?? null;
        let seoDescription = tr.seoDescription ?? current?.seoDescription ?? null;
        if (input.autoSeo && tr.locale === "vi") {
          const derived = deriveSeoFields({
            name,
            slug,
            shortDescription: tr.shortDescription ?? current?.shortDescription ?? null,
            seoTitleOverride: tr.seoTitle,
            seoDescriptionOverride: tr.seoDescription,
            hasCover: Boolean(input.coverMediaPublicId ?? metadata.coverMediaPublicId),
            hasIcon: Boolean(input.iconMediaPublicId ?? snapshot.iconMediaPublicId),
          });
          if (!tr.seoTitle?.trim()) seoTitle = derived.seoTitle;
          if (!tr.seoDescription?.trim()) seoDescription = derived.seoDescription;
        }

        await this.upsertTranslation({
          productId: input.productId,
          locale: tr.locale,
          name,
          shortDescription: tr.shortDescription ?? current?.shortDescription ?? null,
          description: tr.fullDescription ?? current?.description ?? null,
          content: null,
          seoTitle,
          seoDescription,
          actorUserId: input.actorUserId,
        });
      }

      const [devicesFeature, accountFeature] = await Promise.all([
        this.ensureFeatureByKey(STUDIO_FEATURE_KEYS.devicesMax, "integer", "Số thiết bị tối đa"),
        this.ensureFeatureByKey(STUDIO_FEATURE_KEYS.accountRequired, "boolean", "Yêu cầu tài khoản Khepree"),
      ]);
      const accessFeatureKey =
        technical?.accessFeatureKey ??
        parseAccessFeatureKey(metadata) ??
        suggestAccessFeatureKey(nameVi);
      const accessFeature = await this.ensureFeatureByKey(accessFeatureKey, "boolean", "Product access");
      const productCode =
        technical?.productCode ?? parseProductCode(metadata) ?? suggestProductCode(nameVi);

      for (const planInput of input.plans) {
        if (planInput.remove && planInput.planId) {
          try {
            await this.archivePlan({ planId: planInput.planId, productId: input.productId, actorUserId: input.actorUserId });
          } catch (cause) {
            errors.push(
              `Không thể xóa gói ${planInput.nameVi}: ${cause instanceof Error ? cause.message : "lỗi"}`,
            );
          }
          continue;
        }

        const nameVi = planInput.nameVi.trim();
        if (!nameVi) continue;

        const { billingType, accessTermDays } = resolveAccessTerm(planInput.termKind, planInput.termCount);
        const planSlug = planInput.slug?.trim() || suggestPlanSlug(nameVi);
        const existingPlan = planInput.planId
          ? snapshot.plans.find((p) => p.id === planInput.planId)
          : undefined;
        const internalCode =
          planInput.internalPlanCode?.trim() ||
          existingPlan?.internalCode ||
          suggestInternalPlanCode(productCode, planInput.termKind, nameVi);
        const plan = await this.savePlan({
          productId: input.productId,
          planId: planInput.planId,
          slug: planSlug,
          internalCode,
          billingType,
          accessTermDays,
          nameVi,
          nameEn: planInput.nameEn,
          status: "draft",
          actorUserId: input.actorUserId,
        });

        const amount = planInput.amountMajor.replace(/\D/g, "");
        await this.savePrice({
          planId: plan.id,
          priceId: snapshot.plans.find((p) => p.id === plan.id)?.prices[0]?.id,
          currency: DEFAULT_CURRENCY,
          amountMajor: amount || "0",
          isActive: true,
          actorUserId: input.actorUserId,
        });

        await this.upsertPlanFeature({
          planId: plan.id,
          featureId: accessFeature.id,
          valueType: "boolean",
          booleanValue: true,
          actorUserId: input.actorUserId,
        });
        await this.upsertPlanFeature({
          planId: plan.id,
          featureId: devicesFeature.id,
          valueType: "integer",
          integerValue: Math.max(1, planInput.deviceLimit),
          actorUserId: input.actorUserId,
        });
        await this.upsertPlanFeature({
          planId: plan.id,
          featureId: accountFeature.id,
          valueType: "boolean",
          booleanValue: planInput.accountRequired,
          actorUserId: input.actorUserId,
        });
        await this.applyDeviceTransferPolicy({
          planId: plan.id,
          planInput,
          actorUserId: input.actorUserId,
        });

        if (planInput.recommended) {
          metadata.recommendedPlanPublicId = plan.publicId;
          await this.db.update(products).set({ metadata }).where(eq(products.id, input.productId));
        }
      }
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : "Lưu thất bại");
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  private async ensureFeatureByKey(key: string, valueType: FeatureValueType, nameVi: string) {
    const [existing] = await this.db.select().from(features).where(eq(features.key, key)).limit(1);
    if (existing) return existing;
    const [row] = await this.db.insert(features).values({ key, valueType }).returning();
    if (!row) throw new CatalogError("CONFLICT", `Không thể tạo feature ${key}`);
    await this.db.insert(featureTranslations).values([
      { featureId: row.id, locale: "vi", name: nameVi },
      { featureId: row.id, locale: "en", name: nameVi },
    ]);
    return row;
  }

  private async deletePlanFeatureByKey(planId: string, featureKey: string) {
    const [feature] = await this.db.select().from(features).where(eq(features.key, featureKey)).limit(1);
    if (!feature) return;
    await this.db
      .delete(planFeatures)
      .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureId, feature.id)));
  }

  private async applyDeviceTransferPolicy(input: {
    planId: string;
    planInput: SaveStudioDraftInput["plans"][number];
    actorUserId?: string | null;
  }) {
    const useDefault = input.planInput.useDefaultDevicePolicy !== false;
    if (useDefault) {
      await this.deletePlanFeatureByKey(input.planId, STUDIO_FEATURE_KEYS.deviceTransfersMax);
      await this.deletePlanFeatureByKey(input.planId, STUDIO_FEATURE_KEYS.deviceTransfersWindowDays);
      return;
    }

    const transfersFeature = await this.ensureFeatureByKey(
      STUDIO_FEATURE_KEYS.deviceTransfersMax,
      "integer",
      "Giới hạn chuyển thiết bị",
    );
    const windowFeature = await this.ensureFeatureByKey(
      STUDIO_FEATURE_KEYS.deviceTransfersWindowDays,
      "integer",
      "Cửa sổ chuyển thiết bị (ngày)",
    );

    const selfService = input.planInput.selfServiceDeviceRemoval !== false;
    const maxTransfers = selfService
      ? Math.max(0, input.planInput.deviceTransferMax ?? DEFAULT_DEVICE_TRANSFER_LIMIT)
      : 0;
    const windowDays = Math.max(
      1,
      input.planInput.deviceTransferWindowDays ?? DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS,
    );

    await this.upsertPlanFeature({
      planId: input.planId,
      featureId: transfersFeature.id,
      valueType: "integer",
      integerValue: maxTransfers,
      actorUserId: input.actorUserId,
    });
    await this.upsertPlanFeature({
      planId: input.planId,
      featureId: windowFeature.id,
      valueType: "integer",
      integerValue: windowDays,
      actorUserId: input.actorUserId,
    });
  }

  async archivePlan(input: { planId: string; productId: string; actorUserId?: string | null }) {
    const [plan] = await this.db
      .select()
      .from(plans)
      .where(and(eq(plans.id, input.planId), eq(plans.productId, input.productId)))
      .limit(1);
    if (!plan) throw new CatalogError("NOT_FOUND", "Plan not found");
    await this.db
      .update(plans)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(plans.id, input.planId));
    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.plan.archive",
      resourceType: "plan",
      resourceId: plan.publicId,
    });
  }

  previewToken(productId: string): string {
    return createProductPreviewToken({ productId, secret: this.previewSecret });
  }

  previewUrl(product: { slug: string; id: string }, webBaseUrl: string): string {
    const token = this.previewToken(product.id);
    return `${webBaseUrl.replace(/\/$/, "")}/vi/products/${product.slug}?preview=${encodeURIComponent(token)}`;
  }
}

export function createProductStudioService(
  db: Database,
  audit: AuditService,
  previewSecret: string,
): ProductStudioService {
  return new ProductStudioService(db, audit, previewSecret);
}

export { computeProductReadiness };
