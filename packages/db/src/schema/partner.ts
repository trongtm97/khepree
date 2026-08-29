import { index, integer, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { plans } from "./catalog";
import { user } from "./identity";
import { timestamps } from "./_shared";

export const partnerRoleEnum = pgEnum("partner_role", [
  "PARTNER_OWNER",
  "PARTNER_MANAGER",
  "PARTNER_SALES",
]);

export const partnerTiers = pgTable(
  "partner_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    commissionBps: integer("commission_bps").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("partner_tiers_slug_idx").on(table.slug)],
);

export const partners = pgTable(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tierId: uuid("tier_id").references(() => partnerTiers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("partners_slug_idx").on(table.slug),
    index("partners_created_at_idx").on(table.createdAt),
  ],
);

export const partnerPrices = pgTable(
  "partner_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("partner_price_partner_plan_unique").on(table.partnerId, table.planId),
    index("partner_prices_partner_id_idx").on(table.partnerId),
  ],
);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .unique()
      .references(() => partners.id, { onDelete: "restrict" }),
    balanceMinor: integer("balance_minor").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    ...timestamps,
  },
  (table) => [index("wallets_partner_id_idx").on(table.partnerId)],
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(),
    type: text("type").notNull(),
    referenceId: text("reference_id"),
    ...timestamps,
  },
  (table) => [
    index("wallet_transactions_wallet_id_idx").on(table.walletId),
    index("wallet_transactions_created_at_idx").on(table.createdAt),
  ],
);

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    referredUserId: text("referred_user_id").references(() => user.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    ...timestamps,
  },
  (table) => [index("referrals_partner_id_idx").on(table.partnerId)],
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    orderId: uuid("order_id"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    index("commissions_partner_id_idx").on(table.partnerId),
    index("commissions_order_id_idx").on(table.orderId),
  ],
);

export const partnerMemberships = pgTable(
  "partner_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: partnerRoleEnum("role").notNull().default("PARTNER_SALES"),
    ...timestamps,
  },
  (table) => [
    unique("partner_membership_partner_user_unique").on(table.partnerId, table.userId),
    index("partner_memberships_user_id_idx").on(table.userId),
  ],
);
