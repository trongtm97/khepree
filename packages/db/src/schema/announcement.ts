import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { user } from "./identity";
import { products } from "./catalog";
import {
  releaseArchitectureEnum,
  releaseChannelEnum,
  releasePlatformEnum,
} from "./release";

export const announcementSeverityEnum = pgEnum("announcement_severity", [
  "info",
  "success",
  "warning",
  "error",
  "action_required",
]);

export const announcementStatusEnum = pgEnum("announcement_status", [
  "draft",
  "published",
  "expired",
  "archived",
]);

export const announcementCtaKindEnum = pgEnum("announcement_cta_kind", [
  "none",
  "open_url",
  "open_path",
]);

export type AnnouncementSeverity = (typeof announcementSeverityEnum.enumValues)[number];
export type AnnouncementStatus = (typeof announcementStatusEnum.enumValues)[number];
export type AnnouncementCtaKind = (typeof announcementCtaKindEnum.enumValues)[number];

/** Broadcast announcement — one row, many readers via announcement_receipts. */
export const systemAnnouncements = pgTable(
  "system_announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
    severity: announcementSeverityEnum("severity").notNull().default("info"),
    status: announcementStatusEnum("status").notNull().default("draft"),
    targetPlatform: releasePlatformEnum("target_platform"),
    targetArchitecture: releaseArchitectureEnum("target_architecture"),
    releaseChannel: releaseChannelEnum("release_channel"),
    minimumAppVersion: text("minimum_app_version"),
    maximumAppVersion: text("maximum_app_version"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ctaKind: announcementCtaKindEnum("cta_kind").notNull().default("none"),
    ctaPayload: jsonb("cta_payload").$type<Record<string, unknown>>(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("system_announcements_status_starts_at_idx").on(table.status, table.startsAt),
    index("system_announcements_product_status_idx").on(table.productId, table.status),
    index("system_announcements_published_at_idx").on(table.publishedAt),
    index("system_announcements_target_platform_idx").on(table.targetPlatform),
    index("system_announcements_release_channel_idx").on(table.releaseChannel),
  ],
);

export const announcementTranslations = pgTable(
  "announcement_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => systemAnnouncements.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    ...timestamps,
  },
  (table) => [
    unique("announcement_translation_announcement_locale_unique").on(
      table.announcementId,
      table.locale,
    ),
    index("announcement_translations_announcement_id_idx").on(table.announcementId),
  ],
);

export const announcementReceipts = pgTable(
  "announcement_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => systemAnnouncements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    firstDeliveredAt: timestamp("first_delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("announcement_receipt_announcement_user_unique").on(
      table.announcementId,
      table.userId,
    ),
    index("announcement_receipts_user_id_idx").on(table.userId),
    index("announcement_receipts_announcement_id_idx").on(table.announcementId),
  ],
);
