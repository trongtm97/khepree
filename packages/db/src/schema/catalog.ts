import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    status: productStatusEnum("status").notNull().default("draft"),
    shortDescription: text("short_description"),
    description: text("description"),
    content: text("content"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
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

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
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

export const features = pgTable(
  "features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    valueType: featureValueTypeEnum("value_type").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [index("features_key_idx").on(table.key)],
);

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
    valueType: featureValueTypeEnum("value_type").notNull(),
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
    amountMinor: integer("amount_minor").notNull(),
    interval: text("interval"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("prices_plan_id_idx").on(table.planId),
    index("prices_active_idx").on(table.isActive),
  ],
);
