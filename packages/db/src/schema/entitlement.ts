import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { plans, products } from "./catalog";
import { timestamps } from "./_shared";

export const principalTypeEnum = pgEnum("principal_type", ["USER", "ORGANIZATION"]);

export const entitlementStatusEnum = pgEnum("entitlement_status", [
  "active",
  "expired",
  "revoked",
  "suspended",
]);

export const entitlementSourceEnum = pgEnum("entitlement_source", [
  "trial",
  "subscription",
  "perpetual",
  "complimentary",
  "reseller",
  "admin_grant",
]);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    principalType: principalTypeEnum("principal_type").notNull(),
    principalId: text("principal_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "restrict" }),
    status: entitlementStatusEnum("status").notNull().default("active"),
    source: entitlementSourceEnum("source").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    featureSnapshot: jsonb("feature_snapshot").notNull(),
    featureSnapshotVersion: integer("feature_snapshot_version").notNull().default(1),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("entitlements_principal_idx").on(table.principalType, table.principalId),
    index("entitlements_product_status_idx").on(table.productId, table.status),
    index("entitlements_active_lookup_idx").on(
      table.principalType,
      table.principalId,
      table.productId,
      table.status,
    ),
    index("entitlements_created_at_idx").on(table.createdAt),
  ],
);

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlements.id, { onDelete: "restrict" }),
    keyHash: text("key_hash"),
    label: text("label"),
    ...timestamps,
  },
  (table) => [
    index("licenses_entitlement_id_idx").on(table.entitlementId),
    index("licenses_public_id_idx").on(table.publicId),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    fingerprint: text("fingerprint").notNull(),
    platform: text("platform"),
    name: text("name"),
    ...timestamps,
  },
  (table) => [
    unique("devices_fingerprint_unique").on(table.fingerprint),
    index("devices_fingerprint_idx").on(table.fingerprint),
  ],
);

export const activations = pgTable(
  "activations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "restrict" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "restrict" }),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("activations_license_id_idx").on(table.licenseId),
    index("activations_device_id_idx").on(table.deviceId),
    index("activations_active_lookup_idx").on(table.licenseId, table.deactivatedAt),
  ],
);

export const licenseLeases = pgTable(
  "license_leases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "restrict" }),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlements.id, { onDelete: "restrict" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "restrict" }),
    leaseToken: text("lease_token").notNull().unique(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("license_leases_license_id_idx").on(table.licenseId),
    index("license_leases_device_id_idx").on(table.deviceId),
  ],
);

export const licenseEvents = pgTable(
  "license_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    ...timestamps,
  },
  (table) => [
    index("license_events_license_id_idx").on(table.licenseId),
    index("license_events_created_at_idx").on(table.createdAt),
  ],
);
