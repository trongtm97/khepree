import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { softDelete, timestamps } from "./_shared";

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
    sizeBytes: integer("size_bytes").notNull(),
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
