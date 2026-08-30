import { bigint, boolean, index, integer, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { softDelete, timestamps } from "./_shared";
import { user } from "./identity";

export const contentTypeEnum = pgEnum("content_type", [
  "page",
  "article",
  "doc",
  "product_page",
  "legal",
]);

export const contentStatusEnum = pgEnum("content_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const storageProviderEnum = pgEnum("storage_provider", ["r2", "mock"]);

export const mediaVisibilityEnum = pgEnum("media_visibility", ["public", "private"]);

export const contentCategories = pgTable(
  "content_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    slug: text("slug").notNull().unique(),
    ...timestamps,
  },
  (table) => [index("content_categories_slug_idx").on(table.slug)],
);

export const contentCategoryTranslations = pgTable(
  "content_category_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => contentCategories.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("content_category_translation_unique").on(table.categoryId, table.locale),
    index("content_category_translations_category_id_idx").on(table.categoryId),
  ],
);

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    slug: text("slug").notNull(),
    contentType: contentTypeEnum("content_type").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    unique("content_entry_slug_type_unique").on(table.slug, table.contentType),
    index("content_entries_created_at_idx").on(table.createdAt),
    index("content_entries_slug_idx").on(table.slug),
  ],
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    bodyStorageProvider: storageProviderEnum("body_storage_provider"),
    bodyStorageBucket: text("body_storage_bucket"),
    bodyObjectKey: text("body_object_key"),
    featuredMediaId: uuid("featured_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    authorUserId: text("author_user_id").references(() => user.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => contentCategories.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("content_version_entry_locale_version_unique").on(
      table.entryId,
      table.locale,
      table.versionNumber,
    ),
    index("content_versions_entry_id_idx").on(table.entryId),
    index("content_versions_status_idx").on(table.status),
    index("content_versions_published_at_idx").on(table.publishedAt),
    uniqueIndex("content_versions_one_published_per_locale")
      .on(table.entryId, table.locale)
      .where(sql`${table.status} = 'PUBLISHED'`),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    storageProvider: storageProviderEnum("storage_provider").notNull().default("mock"),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    /** BIGINT in Postgres (no 2GB int4 cap). JS number is safe below Number.MAX_SAFE_INTEGER. */
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256"),
    width: integer("width"),
    height: integer("height"),
    visibility: mediaVisibilityEnum("visibility").notNull(),
    altText: text("alt_text"),
    ownerType: text("owner_type"),
    ownerId: text("owner_id"),
    context: text("context"),
    ...timestamps,
  },
  (table) => [
    index("media_assets_created_at_idx").on(table.createdAt),
    index("media_assets_visibility_idx").on(table.visibility),
    index("media_assets_context_idx").on(table.context),
  ],
);

export const urlRedirects = pgTable(
  "url_redirects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromPath: text("from_path").notNull().unique(),
    toPath: text("to_path").notNull(),
    status: integer("status").notNull().default(308),
    isActive: boolean("is_active").notNull().default(true),
    note: text("note"),
    ...timestamps,
  },
  (table) => [index("url_redirects_active_idx").on(table.isActive)],
);
