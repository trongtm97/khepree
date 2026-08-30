import {
  bigint,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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

export type ReleaseStatus = (typeof releaseStatusEnum.enumValues)[number];
export type ReleasePlatform = (typeof releasePlatformEnum.enumValues)[number];
export type ReleaseArchitecture = (typeof releaseArchitectureEnum.enumValues)[number];
export type ReleaseChannel = (typeof releaseChannelEnum.enumValues)[number];

/** Desktop software release artifact bound to a product and private media. */
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
