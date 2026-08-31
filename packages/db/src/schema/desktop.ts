import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "./catalog";
import { devices } from "./entitlement";
import { user } from "./identity";
import { timestamps } from "./_shared";

export const desktopClientStatusEnum = pgEnum("desktop_client_status", ["active", "inactive"]);

/** Registered desktop application bound to a catalog product — not a user OAuth client secret store. */
export const desktopClients = pgTable(
  "desktop_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: text("client_id").notNull().unique(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    allowedRedirectUris: jsonb("allowed_redirect_uris").$type<string[]>().notNull(),
    status: desktopClientStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    index("desktop_clients_product_id_idx").on(table.productId),
    index("desktop_clients_status_idx").on(table.status),
  ],
);

export const desktopAuthCodes = pgTable(
  "desktop_auth_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    desktopClientId: uuid("desktop_client_id")
      .notNull()
      .references(() => desktopClients.id, { onDelete: "cascade" }),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull().default("S256"),
    redirectUri: text("redirect_uri").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("desktop_auth_codes_user_id_idx").on(table.userId),
    index("desktop_auth_codes_client_id_idx").on(table.desktopClientId),
    index("desktop_auth_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export const desktopSessions = pgTable(
  "desktop_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    desktopClientId: uuid("desktop_client_id")
      .notNull()
      .references(() => desktopClients.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    devicePublicKey: text("device_public_key"),
    accessTokenHash: text("access_token_hash").notNull(),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }).notNull(),
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }).notNull(),
    rotationVersion: integer("rotation_version").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),
    ...timestamps,
  },
  (table) => [
    index("desktop_sessions_user_id_idx").on(table.userId),
    index("desktop_sessions_client_id_idx").on(table.desktopClientId),
    index("desktop_sessions_access_token_hash_idx").on(table.accessTokenHash),
    index("desktop_sessions_revoked_at_idx").on(table.revokedAt),
  ],
);
