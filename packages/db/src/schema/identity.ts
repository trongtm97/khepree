import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { softDelete, timestamps } from "./_shared";

/** Better Auth core tables — do not duplicate; extend via user_profiles. */
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("user_created_at_idx").on(table.createdAt)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    unique("account_provider_unique").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
});

/** Better Auth two-factor plugin table */
export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("two_factor_user_id_idx").on(table.userId)],
);

export const globalRoleEnum = pgEnum("global_role", [
  "USER",
  "SUPPORT",
  "FINANCE",
  "ADMIN",
  "SUPER_ADMIN",
]);

/** Extended profile — auth identity stays in Better Auth `user` table. */
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    globalRole: globalRoleEnum("global_role").notNull().default("USER"),
    locale: text("locale").notNull().default("vi"),
    timezone: text("timezone"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("user_profiles_global_role_idx").on(table.globalRole)],
);

export const legalDocumentTypeEnum = pgEnum("legal_document_type", ["TERMS", "PRIVACY"]);

export const userConsents = pgTable(
  "user_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentType: legalDocumentTypeEnum("document_type").notNull(),
    documentVersion: text("document_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    unique("user_consent_unique").on(table.userId, table.documentType, table.documentVersion),
    index("user_consents_user_id_idx").on(table.userId),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    index("organizations_created_at_idx").on(table.createdAt),
    index("organizations_slug_idx").on(table.slug),
  ],
);

export const orgRoleEnum = pgEnum("org_role", ["OWNER", "ADMIN", "MEMBER"]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("MEMBER"),
    ...timestamps,
  },
  (table) => [
    unique("membership_org_user_unique").on(table.organizationId, table.userId),
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_organization_id_idx").on(table.organizationId),
  ],
);
