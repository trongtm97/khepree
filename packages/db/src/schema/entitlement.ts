import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

export const licenseStatusEnum = pgEnum("license_status", ["active", "suspended", "revoked"]);

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlements.id, { onDelete: "restrict" }),
    status: licenseStatusEnum("status").notNull().default("active"),
    keyHash: text("key_hash"),
    keyPrefix: text("key_prefix"),
    keyLast4: text("key_last4"),
    label: text("label"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    ...timestamps,
  },
  (table) => [
    index("licenses_entitlement_id_idx").on(table.entitlementId),
    index("licenses_public_id_idx").on(table.publicId),
    index("licenses_status_idx").on(table.status),
    uniqueIndex("licenses_key_hash_unique")
      .on(table.keyHash)
      .where(sql`${table.keyHash} IS NOT NULL`),
  ],
);

export const deviceStatusEnum = pgEnum("device_status", ["active", "deactivated", "blocked"]);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    principalType: principalTypeEnum("principal_type").notNull(),
    principalId: text("principal_id").notNull(),
    installationHash: text("installation_hash").notNull(),
    platform: text("platform"),
    name: text("name"),
    status: deviceStatusEnum("status").notNull().default("active"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedByUserId: text("removed_by_user_id"),
    ...timestamps,
  },
  (table) => [
    unique("devices_principal_installation_unique").on(
      table.principalType,
      table.principalId,
      table.installationHash,
    ),
    index("devices_principal_idx").on(table.principalType, table.principalId),
    index("devices_status_idx").on(table.status),
  ],
);

export const activationStatusEnum = pgEnum("activation_status", ["active", "deactivated"]);

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
    status: activationStatusEnum("status").notNull().default("active"),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("activations_license_id_idx").on(table.licenseId),
    index("activations_device_id_idx").on(table.deviceId),
    uniqueIndex("activations_active_license_device_unique")
      .on(table.licenseId, table.deviceId)
      .where(sql`${table.status} = 'active' AND ${table.deactivatedAt} IS NULL`),
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
    jti: text("jti").notNull().unique(),
    leaseHash: text("lease_hash"),
    schemaVersion: integer("schema_version").notNull().default(1),
    keyId: text("key_id"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("license_leases_license_id_idx").on(table.licenseId),
    index("license_leases_device_id_idx").on(table.deviceId),
    index("license_leases_jti_idx").on(table.jti),
  ],
);

export const deviceRemovalEvents = pgTable(
  "device_removal_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    principalType: principalTypeEnum("principal_type").notNull(),
    principalId: text("principal_id").notNull(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "restrict" }),
    removedByUserId: text("removed_by_user_id"),
    actorType: text("actor_type").notNull().default("owner"),
    bypassTransferQuota: boolean("bypass_transfer_quota").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("device_removal_events_principal_created_idx").on(
      table.principalType,
      table.principalId,
      table.createdAt,
    ),
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
