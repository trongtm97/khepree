import {
  bigint,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./_shared";
import { mediaAssets } from "./content";
import { products } from "./catalog";

export const releaseStatusEnum = pgEnum("release_status", ["draft", "published", "retired"]);

export const releasePlatformEnum = pgEnum("release_platform", ["windows", "macos", "linux"]);

export const releaseArchitectureEnum = pgEnum("release_architecture", [
  "x64",
  "arm64",
  "universal",
]);

export const releaseChannelEnum = pgEnum("release_channel", ["stable", "beta", "alpha"]);

export const releaseArtifactKindEnum = pgEnum("release_artifact_kind", [
  "installer",
  "full-nupkg",
  "delta-nupkg",
  "releases-index",
]);

export type ReleaseStatus = (typeof releaseStatusEnum.enumValues)[number];
export type ReleasePlatform = (typeof releasePlatformEnum.enumValues)[number];
export type ReleaseArchitecture = (typeof releaseArchitectureEnum.enumValues)[number];
export type ReleaseChannel = (typeof releaseChannelEnum.enumValues)[number];
export type ReleaseArtifactKind = (typeof releaseArtifactKindEnum.enumValues)[number];

/** Singleton artifact kinds — at most one row per release (delta-nupkg excluded). */
export const RELEASE_SINGLETON_ARTIFACT_KINDS = [
  "installer",
  "full-nupkg",
  "releases-index",
] as const satisfies readonly ReleaseArtifactKind[];

/** Desktop software release bound to a product; artifacts live in release_artifacts. */
export const softwareReleases = pgTable(
  "software_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    version: text("version").notNull(),
    platform: releasePlatformEnum("platform").notNull(),
    architecture: releaseArchitectureEnum("architecture").notNull(),
    channel: releaseChannelEnum("channel").notNull().default("stable"),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    signature: text("signature"),
    minimumSupportedVersion: text("minimum_supported_version"),
    mandatoryUpdate: boolean("mandatory_update").notNull().default(false),
    status: releaseStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("software_releases_product_id_idx").on(table.productId),
    index("software_releases_status_idx").on(table.status),
    index("software_releases_published_at_idx").on(table.publishedAt),
    unique("software_releases_product_version_target_unique").on(
      table.productId,
      table.version,
      table.platform,
      table.architecture,
      table.channel,
    ),
  ],
);

/** Binary payload for a software release (installer, nupkg, RELEASES index, …). */
export const releaseArtifacts = pgTable(
  "release_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => softwareReleases.id, { onDelete: "cascade" }),
    kind: releaseArtifactKindEnum("kind").notNull(),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    signature: text("signature"),
    signingKeyId: text("signing_key_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("release_artifacts_release_id_idx").on(table.releaseId),
    unique("release_artifacts_release_file_unique").on(table.releaseId, table.fileName),
    uniqueIndex("release_artifacts_release_singleton_kind_unique")
      .on(table.releaseId, table.kind)
      .where(
        sql`${table.kind} in ('installer', 'full-nupkg', 'releases-index')`,
      ),
  ],
);

export const releaseTranslations = pgTable(
  "release_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => softwareReleases.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    releaseNotes: text("release_notes"),
    ...timestamps,
  },
  (table) => [
    unique("release_translation_release_locale_unique").on(table.releaseId, table.locale),
    index("release_translations_release_id_idx").on(table.releaseId),
  ],
);
