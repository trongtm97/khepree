/**
 * Idempotent development seed — safe to rerun.
 * Requires DATABASE_URL and applied migrations.
 */
import { and, eq } from "drizzle-orm";
import { createPublicId } from "../lib/ids";
import { requireDb, closeDb } from "../client";
import {
  features,
  planFeatures,
  plans,
  prices,
  products,
} from "../schema/catalog";

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

async function upsertFeature(
  db: ReturnType<typeof requireDb>,
  input: {
    key: string;
    name: string;
    valueType: "boolean" | "integer" | "string";
    description?: string;
  },
) {
  const [existing] = await db.select().from(features).where(eq(features.key, input.key)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(features)
    .values({
      key: input.key,
      name: input.name,
      valueType: input.valueType,
      description: input.description,
    })
    .returning();

  if (!created) throw new Error(`Failed to seed feature ${input.key}`);
  return created;
}

async function upsertPlan(
  db: ReturnType<typeof requireDb>,
  productId: string,
  input: {
    slug: string;
    name: string;
    billingType: "free" | "one_time" | "recurring" | "perpetual" | "custom";
  },
) {
  const [existing] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.productId, productId), eq(plans.slug, input.slug)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(plans)
    .values({
      publicId: createPublicId("plan"),
      productId,
      slug: input.slug,
      name: input.name,
      billingType: input.billingType,
      status: "active",
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.productId, productId), eq(plans.slug, input.slug)))
    .limit(1);

  if (!row) throw new Error(`Failed to seed plan ${input.slug}`);
  return row;
}

async function upsertPlanFeature(
  db: ReturnType<typeof requireDb>,
  planId: string,
  featureId: string,
  value:
    | { valueType: "boolean"; booleanValue: boolean }
    | { valueType: "integer"; integerValue: number }
    | { valueType: "string"; stringValue: string },
) {
  await db
    .insert(planFeatures)
    .values({
      planId,
      featureId,
      ...value,
    })
    .onConflictDoNothing();
}

async function upsertPrice(
  db: ReturnType<typeof requireDb>,
  planId: string,
  input: {
    publicId: string;
    currency: string;
    amountMinor: number;
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
    .onConflictDoNothing();
}

async function seed() {
  const db = requireDb();

  const [inserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: DEV_SAMPLE_SLUG,
      name: "DEVELOPMENT SAMPLE — Khepree Platform",
      shortDescription: "Local catalog sample — not a commercial product.",
      description: "Non-commercial sample product for local development only. Not for sale.",
      content:
        "This page is rendered entirely from the product catalog domain. Marketing sections, plans, features, and prices are stored in Postgres and surfaced through ProductService.",
      status: "active",
      platformCapabilities: ["web", "desktop", "mobile"],
      seoTitle: "DEVELOPMENT SAMPLE — Khepree Platform",
      seoDescription: "Database-driven product page sample for local development.",
      metadata: MARKETING_METADATA,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();

  let product =
    inserted ??
    (await db.select().from(products).where(eq(products.slug, DEV_SAMPLE_SLUG)).limit(1))[0];

  if (!product) {
    throw new Error("Failed to seed development sample product");
  }

  if (product.status !== "active" || !product.shortDescription) {
    const [updated] = await db
      .update(products)
      .set({
        status: "active",
        shortDescription: "Local catalog sample — not a commercial product.",
        content:
          "This page is rendered entirely from the product catalog domain. Marketing sections, plans, features, and prices are stored in Postgres and surfaced through ProductService.",
        platformCapabilities: ["web", "desktop", "mobile"],
        seoTitle: "DEVELOPMENT SAMPLE — Khepree Platform",
        seoDescription: "Database-driven product page sample for local development.",
        metadata: MARKETING_METADATA,
      })
      .where(eq(products.id, product.id))
      .returning();
    product = updated ?? product;
  }

  const apiAccess = await upsertFeature(db, {
    key: "api_access",
    name: "API access",
    valueType: "boolean",
    description: "Access to HTTP APIs",
  });
  const teamMembers = await upsertFeature(db, {
    key: "team_members",
    name: "Team members",
    valueType: "integer",
    description: "Seats included in the plan",
  });
  const storageGb = await upsertFeature(db, {
    key: "storage_gb",
    name: "Storage (GB)",
    valueType: "integer",
    description: "Included storage capacity",
  });

  const freePlan = await upsertPlan(db, product.id, {
    slug: "sample-free",
    name: "Sample Free",
    billingType: "free",
  });
  const proPlan = await upsertPlan(db, product.id, {
    slug: "sample-pro",
    name: "Sample Pro",
    billingType: "recurring",
  });
  const lifetimePlan = await upsertPlan(db, product.id, {
    slug: "sample-lifetime",
    name: "Sample Lifetime",
    billingType: "one_time",
  });
  const enterprisePlan = await upsertPlan(db, product.id, {
    slug: "sample-enterprise",
    name: "Sample Enterprise",
    billingType: "custom",
  });

  await upsertPlanFeature(db, freePlan.id, apiAccess.id, {
    valueType: "boolean",
    booleanValue: false,
  });
  await upsertPlanFeature(db, freePlan.id, teamMembers.id, {
    valueType: "integer",
    integerValue: 1,
  });
  await upsertPlanFeature(db, freePlan.id, storageGb.id, {
    valueType: "integer",
    integerValue: 1,
  });

  await upsertPlanFeature(db, proPlan.id, apiAccess.id, {
    valueType: "boolean",
    booleanValue: true,
  });
  await upsertPlanFeature(db, proPlan.id, teamMembers.id, {
    valueType: "integer",
    integerValue: 5,
  });
  await upsertPlanFeature(db, proPlan.id, storageGb.id, {
    valueType: "integer",
    integerValue: 25,
  });

  await upsertPlanFeature(db, lifetimePlan.id, apiAccess.id, {
    valueType: "boolean",
    booleanValue: true,
  });
  await upsertPlanFeature(db, lifetimePlan.id, teamMembers.id, {
    valueType: "integer",
    integerValue: 3,
  });
  await upsertPlanFeature(db, lifetimePlan.id, storageGb.id, {
    valueType: "integer",
    integerValue: 10,
  });

  await upsertPlanFeature(db, enterprisePlan.id, apiAccess.id, {
    valueType: "boolean",
    booleanValue: true,
  });
  await upsertPlanFeature(db, enterprisePlan.id, teamMembers.id, {
    valueType: "integer",
    integerValue: 100,
  });
  await upsertPlanFeature(db, enterprisePlan.id, storageGb.id, {
    valueType: "integer",
    integerValue: 500,
  });

  await upsertPrice(db, proPlan.id, {
    publicId: "price_sample_pro_usd",
    currency: "USD",
    amountMinor: 1900,
    interval: "month",
  });
  await upsertPrice(db, proPlan.id, {
    publicId: "price_sample_pro_vnd",
    currency: "VND",
    amountMinor: 490000,
    interval: "month",
    region: "VN",
  });
  await upsertPrice(db, lifetimePlan.id, {
    publicId: "price_sample_lifetime_usd",
    currency: "USD",
    amountMinor: 19900,
    interval: null,
  });

  console.log(`[seed] Development sample product ready: ${product.slug} (${product.publicId})`);
  await closeDb();
}

seed().catch(async (error) => {
  console.error("[seed] Failed:", error);
  await closeDb();
  process.exit(1);
});
