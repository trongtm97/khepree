/**
 * Idempotent development seed — safe to rerun.
 * Requires DATABASE_URL and applied migrations.
 */
import { and, eq } from "drizzle-orm";
import { createPublicId } from "../lib/ids";
import { requireDb, closeDb } from "../client";
import {
  featureTranslations,
  features,
  planFeatures,
  planTranslations,
  plans,
  prices,
  productTranslations,
  products,
} from "../schema/catalog";
import {
  partnerPrices,
  partnerTiers,
  partners,
  referrals,
  wallets,
} from "../schema/partner";
import { desktopClients } from "../schema/desktop";

const DEV_SAMPLE_SLUG = "development-sample";

const MARKETING_METADATA = {
  seed: true,
  environment: "development",
  marketing: {
    benefits: [
      {
        title: "Development-only sample",
        description: "This product exists to exercise the catalog domain locally — not for sale.",
      },
      {
        title: "Feature-driven plans",
        description: "Plan limits come from feature keys, not hard-coded plan names.",
      },
    ],
    highlights: [
      {
        title: "Catalog API",
        description: "Products, plans, features, and prices load from Postgres.",
      },
      {
        title: "Multi-platform ready",
        description: "Desktop, web, and mobile capabilities are modeled on the product record.",
      },
    ],
    howItWorks: [
      {
        step: 1,
        title: "Browse the catalog",
        description: "Public pages read active products from the shared ProductService.",
      },
      {
        step: 2,
        title: "Compare plans",
        description: "Pricing cards render from plan billing types and price rows.",
      },
      {
        step: 3,
        title: "Entitlements later",
        description: "Ownership is not faked — account pages show architecture only for now.",
      },
    ],
    faq: [
      {
        question: "Is this a real product?",
        answer: "No. It is a DEVELOPMENT SAMPLE labeled clearly in the name and copy.",
      },
      {
        question: "Why are prices shown?",
        answer: "Sample USD/VND amounts validate formatting and multi-currency architecture only.",
      },
    ],
    relatedContent: [
      { title: "All products", href: "/products" },
      { title: "Pricing overview", href: "/pricing" },
    ],
    cta: {
      headline: "Explore the development sample",
      description: "Use this record to verify database-driven product pages locally.",
      buttonLabel: "View pricing",
      buttonHref: "/pricing",
    },
  },
};

const PRODUCT_COPY = {
  en: {
    name: "DEVELOPMENT SAMPLE — Khepree Platform",
    shortDescription: "Local catalog sample — not a commercial product.",
    description: "Non-commercial sample product for local development only. Not for sale.",
    content:
      "This page is rendered entirely from the product catalog domain. Marketing sections, plans, features, and prices are stored in Postgres and surfaced through ProductService.",
    seoTitle: "DEVELOPMENT SAMPLE — Khepree Platform",
    seoDescription: "Database-driven product page sample for local development.",
  },
  vi: {
    name: "MẪU PHÁT TRIỂN — Khepree Platform",
    shortDescription: "Mẫu catalog cục bộ — không phải sản phẩm thương mại.",
    description: "Sản phẩm mẫu cho môi trường dev. Không bán.",
    content: "Trang này được render từ domain catalog sản phẩm trong Postgres.",
    seoTitle: "MẪU PHÁT TRIỂN — Khepree Platform",
    seoDescription: "Trang sản phẩm mẫu cho phát triển cục bộ.",
  },
};

async function upsertFeature(
  db: ReturnType<typeof requireDb>,
  input: {
    key: string;
    nameEn: string;
    nameVi: string;
    valueType: "boolean" | "integer" | "string";
    description?: string;
  },
) {
  const [existing] = await db.select().from(features).where(eq(features.key, input.key)).limit(1);
  const feature =
    existing ??
    (
      await db
        .insert(features)
        .values({
          key: input.key,
          valueType: input.valueType,
          description: input.description,
        })
        .returning()
    )[0];

  if (!feature) throw new Error(`Failed to seed feature ${input.key}`);

  for (const [locale, name] of [
    ["en", input.nameEn],
    ["vi", input.nameVi],
  ] as const) {
    await db
      .insert(featureTranslations)
      .values({ featureId: feature.id, locale, name, description: input.description ?? null })
      .onConflictDoNothing();
  }

  return feature;
}

async function upsertPlan(
  db: ReturnType<typeof requireDb>,
  productId: string,
  input: {
    slug: string;
    nameEn: string;
    nameVi: string;
    billingType: "free" | "one_time" | "recurring" | "perpetual" | "custom";
    accessTermDays?: number | null;
  },
) {
  const [existing] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.productId, productId), eq(plans.slug, input.slug)))
    .limit(1);

  const plan =
    existing ??
    (
      await db
        .insert(plans)
        .values({
          publicId: createPublicId("plan"),
          productId,
          slug: input.slug,
          billingType: input.billingType,
          accessTermDays: input.accessTermDays ?? null,
          status: "active",
        })
        .returning()
    )[0];

  if (!plan) throw new Error(`Failed to seed plan ${input.slug}`);

  await db
    .update(plans)
    .set({
      billingType: input.billingType,
      accessTermDays: input.accessTermDays ?? null,
      updatedAt: new Date(),
    })
    .where(eq(plans.id, plan.id));

  for (const [locale, name] of [
    ["en", input.nameEn],
    ["vi", input.nameVi],
  ] as const) {
    await db
      .insert(planTranslations)
      .values({ planId: plan.id, locale, name })
      .onConflictDoNothing();
  }

  return plan;
}

async function upsertPlanFeatureValue(
  db: ReturnType<typeof requireDb>,
  planId: string,
  featureId: string,
  valueType: "boolean" | "integer" | "string",
  value: boolean | number | string,
) {
  const columns =
    valueType === "boolean"
      ? { booleanValue: value as boolean, integerValue: null, stringValue: null }
      : valueType === "integer"
        ? { booleanValue: null, integerValue: value as number, stringValue: null }
        : { booleanValue: null, integerValue: null, stringValue: value as string };

  await db
    .insert(planFeatures)
    .values({ planId, featureId, ...columns })
    .onConflictDoNothing();
}

async function upsertPrice(
  db: ReturnType<typeof requireDb>,
  planId: string,
  input: {
    publicId: string;
    currency: string;
    amountMinor: bigint;
    interval?: string | null;
    region?: string | null;
  },
) {
  await db
    .insert(prices)
    .values({
      publicId: input.publicId,
      planId,
      currency: input.currency,
      amountMinor: input.amountMinor,
      interval: input.interval ?? null,
      region: input.region ?? null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: prices.publicId,
      set: {
        amountMinor: input.amountMinor,
        interval: input.interval ?? null,
        region: input.region ?? null,
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

async function seed() {
  const db = requireDb();

  const [inserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: DEV_SAMPLE_SLUG,
      status: "hidden",
      platformCapabilities: ["web", "desktop", "mobile"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: MARKETING_METADATA,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();

  const product =
    inserted ??
    (await db.select().from(products).where(eq(products.slug, DEV_SAMPLE_SLUG)).limit(1))[0];

  if (!product) throw new Error("Failed to seed development sample product");

  await db
    .update(products)
    .set({ status: "hidden", metadata: MARKETING_METADATA, updatedAt: new Date() })
    .where(eq(products.slug, DEV_SAMPLE_SLUG));

  for (const locale of ["en", "vi"] as const) {
    const copy = PRODUCT_COPY[locale];
    await db
      .insert(productTranslations)
      .values({ productId: product.id, locale, ...copy })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: { ...copy, updatedAt: new Date() },
      });
  }

  const apiAccess = await upsertFeature(db, {
    key: "api_access",
    nameEn: "API access",
    nameVi: "Truy cập API",
    valueType: "boolean",
  });
  const teamMembers = await upsertFeature(db, {
    key: "team_members",
    nameEn: "Team members",
    nameVi: "Thành viên nhóm",
    valueType: "integer",
  });
  const storageGb = await upsertFeature(db, {
    key: "storage_gb",
    nameEn: "Storage (GB)",
    nameVi: "Dung lượng (GB)",
    valueType: "integer",
  });
  const devicesMax = await upsertFeature(db, {
    key: "devices.max",
    nameEn: "Max devices",
    nameVi: "Số thiết bị tối đa",
    valueType: "integer",
  });

  const freePlan = await upsertPlan(db, product.id, {
    slug: "sample-free",
    nameEn: "Sample Free",
    nameVi: "Mẫu Miễn phí",
    billingType: "free",
  });
  const proPlan = await upsertPlan(db, product.id, {
    slug: "sample-pro",
    nameEn: "Sample Pro",
    nameVi: "Mẫu Pro",
    billingType: "one_time",
    accessTermDays: 365,
  });
  const lifetimePlan = await upsertPlan(db, product.id, {
    slug: "sample-lifetime",
    nameEn: "Sample Lifetime",
    nameVi: "Mẫu Trọn đời",
    billingType: "one_time",
  });
  const enterprisePlan = await upsertPlan(db, product.id, {
    slug: "sample-enterprise",
    nameEn: "Sample Enterprise",
    nameVi: "Mẫu Doanh nghiệp",
    billingType: "custom",
  });

  await upsertPlanFeatureValue(db, freePlan.id, apiAccess.id, "boolean", false);
  await upsertPlanFeatureValue(db, freePlan.id, teamMembers.id, "integer", 1);
  await upsertPlanFeatureValue(db, freePlan.id, storageGb.id, "integer", 1);
  await upsertPlanFeatureValue(db, freePlan.id, devicesMax.id, "integer", 1);

  await upsertPlanFeatureValue(db, proPlan.id, apiAccess.id, "boolean", true);
  await upsertPlanFeatureValue(db, proPlan.id, teamMembers.id, "integer", 5);
  await upsertPlanFeatureValue(db, proPlan.id, storageGb.id, "integer", 25);
  await upsertPlanFeatureValue(db, proPlan.id, devicesMax.id, "integer", 5);

  await upsertPlanFeatureValue(db, lifetimePlan.id, apiAccess.id, "boolean", true);
  await upsertPlanFeatureValue(db, lifetimePlan.id, teamMembers.id, "integer", 3);
  await upsertPlanFeatureValue(db, lifetimePlan.id, storageGb.id, "integer", 10);
  await upsertPlanFeatureValue(db, lifetimePlan.id, devicesMax.id, "integer", 3);

  await upsertPlanFeatureValue(db, enterprisePlan.id, apiAccess.id, "boolean", true);
  await upsertPlanFeatureValue(db, enterprisePlan.id, teamMembers.id, "integer", 100);
  await upsertPlanFeatureValue(db, enterprisePlan.id, storageGb.id, "integer", 500);
  await upsertPlanFeatureValue(db, enterprisePlan.id, devicesMax.id, "integer", 100);

  await upsertPrice(db, proPlan.id, {
    publicId: "price_sample_pro_usd",
    currency: "USD",
    amountMinor: 1900n,
    interval: "year",
  });
  await upsertPrice(db, proPlan.id, {
    publicId: "price_sample_pro_vnd",
    currency: "VND",
    amountMinor: 599000n,
    interval: "year",
    region: "VN",
  });
  await upsertPrice(db, lifetimePlan.id, {
    publicId: "price_sample_lifetime_usd",
    currency: "USD",
    amountMinor: 19900n,
    interval: null,
  });
  await upsertPrice(db, lifetimePlan.id, {
    publicId: "price_sample_lifetime_vnd",
    currency: "VND",
    amountMinor: 499000n,
    interval: null,
    region: "VN",
  });

  const [tierInserted] = await db
    .insert(partnerTiers)
    .values({ slug: "standard", name: "Standard", commissionBps: 1000 })
    .onConflictDoNothing({ target: partnerTiers.slug })
    .returning();
  const tier =
    tierInserted ??
    (await db.select().from(partnerTiers).where(eq(partnerTiers.slug, "standard")).limit(1))[0];
  if (!tier) throw new Error("Failed to seed partner tier");

  const PARTNER_SLUG = "development-sample-partner";
  const [partnerInserted] = await db
    .insert(partners)
    .values({
      publicId: createPublicId("ptr"),
      slug: PARTNER_SLUG,
      name: "DEVELOPMENT SAMPLE Partner",
      tierId: tier.id,
      status: "active",
      modes: ["REFERRAL", "RESELLER"],
      allowNegativeBalance: false,
    })
    .onConflictDoNothing({ target: partners.slug })
    .returning();
  const partner =
    partnerInserted ??
    (await db.select().from(partners).where(eq(partners.slug, PARTNER_SLUG)).limit(1))[0];
  if (!partner) throw new Error("Failed to seed development partner");

  await db
    .insert(wallets)
    .values({ partnerId: partner.id, balanceMinor: 0n, currency: "USD" })
    .onConflictDoNothing({ target: wallets.partnerId });

  await db
    .insert(partnerPrices)
    .values({
      partnerId: partner.id,
      planId: proPlan.id,
      amountMinor: 1500n,
      currency: "USD",
    })
    .onConflictDoNothing();

  await db
    .insert(referrals)
    .values({
      publicId: createPublicId("ref"),
      partnerId: partner.id,
      code: "KHDEV001",
      label: "Development sample",
    })
    .onConflictDoNothing({ target: referrals.code });

  console.log(`[seed] Development sample product ready: ${product.slug} (${product.publicId})`);

  const DEV_DESKTOP_CLIENT_ID = "dev-desktop-sample";
  await db
    .insert(desktopClients)
    .values({
      clientId: DEV_DESKTOP_CLIENT_ID,
      productId: product.id,
      displayName: "Development Desktop Sample",
      allowedRedirectUris: ["khepree-dev://auth/callback", "http://127.0.0.1:0/auth/callback"],
      status: "active",
    })
    .onConflictDoNothing({ target: desktopClients.clientId });
  console.log(`[seed] Desktop client registered: ${DEV_DESKTOP_CLIENT_ID}`);

  console.log(
    `[seed] Partner ${partner.slug} is ACTIVE (referral+reseller). Attach a partner_memberships row after creating an account.`,
  );
  await closeDb();
}

seed().catch(async (error) => {
  console.error("[seed] Failed:", error);
  await closeDb();
  process.exit(1);
});
