import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./_shared";
import { mediaAssets } from "./content";

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "hidden",
  "retired",
]);

export const planBillingTypeEnum = pgEnum("plan_billing_type", [
  "free",
  "one_time",
  "recurring",
  "perpetual",
  "custom",
]);

export const productPlatformSchema = ["desktop", "web", "mobile"] as const;
export type ProductPlatform = (typeof productPlatformSchema)[number];

export const planStatusEnum = pgEnum("plan_status", ["draft", "active", "archived"]);

export const featureValueTypeEnum = pgEnum("feature_value_type", [
  "boolean",
  "integer",
  "string",
]);

/** Non-localized product identity — commercial text lives in product_translations. */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    slug: text("slug").notNull().unique(),
    status: productStatusEnum("status").notNull().default("draft"),
    iconMediaId: uuid("icon_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    platformCapabilities: jsonb("platform_capabilities")
      .$type<ProductPlatform[]>()
      .notNull()
      .default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index("products_slug_idx").on(table.slug),
    index("products_status_idx").on(table.status),
    index("products_created_at_idx").on(table.createdAt),
  ],
);

export const productTranslations = pgTable(
  "product_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    content: text("content"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (table) => [
    unique("product_translation_product_locale_unique").on(table.productId, table.locale),
    index("product_translations_product_id_idx").on(table.productId),
    index("product_translations_locale_idx").on(table.locale),
  ],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    billingType: planBillingTypeEnum("billing_type").notNull().default("free"),
    status: planStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (table) => [
    unique("plan_product_slug_unique").on(table.productId, table.slug),
    index("plans_product_id_idx").on(table.productId),
    index("plans_status_idx").on(table.status),
  ],
);

export const planTranslations = pgTable(
  "plan_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    unique("plan_translation_plan_locale_unique").on(table.planId, table.locale),
    index("plan_translations_plan_id_idx").on(table.planId),
  ],
);

export const features = pgTable(
  "features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    valueType: featureValueTypeEnum("value_type").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [index("features_key_idx").on(table.key)],
);

export const featureTranslations = pgTable(
  "feature_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    unique("feature_translation_feature_locale_unique").on(table.featureId, table.locale),
    index("feature_translations_feature_id_idx").on(table.featureId),
  ],
);

/** Canonical feature type is features.valueType — plan_features stores values only. */
export const planFeatures = pgTable(
  "plan_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "restrict" }),
    booleanValue: boolean("boolean_value"),
    integerValue: integer("integer_value"),
    stringValue: text("string_value"),
    ...timestamps,
  },
  (table) => [
    unique("plan_feature_unique").on(table.planId, table.featureId),
    index("plan_features_plan_id_idx").on(table.planId),
  ],
);

export const prices = pgTable(
  "prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    currency: text("currency").notNull(),
    region: text("region"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    interval: text("interval"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("prices_plan_id_idx").on(table.planId),
    index("prices_active_idx").on(table.isActive),
    uniqueIndex("prices_active_identity_unique")
      .on(
        table.planId,
        table.currency,
        sql`COALESCE(${table.region}, '')`,
        sql`COALESCE(${table.interval}, '')`,
      )
      .where(sql`${table.isActive} = true`),
  ],
);
