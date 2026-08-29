import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { plans } from "./catalog";
import { orders } from "./commerce";
import { user } from "./identity";
import { entitlements } from "./entitlement";
import { timestamps } from "./_shared";

export const partnerRoleEnum = pgEnum("partner_role", [
  "PARTNER_OWNER",
  "PARTNER_MANAGER",
  "PARTNER_SALES",
]);

export const partnerStatusEnum = pgEnum("partner_status", [
  "pending",
  "active",
  "suspended",
  "rejected",
]);

export const partnerModes = ["REFERRAL", "RESELLER", "DISTRIBUTOR"] as const;
export type PartnerMode = (typeof partnerModes)[number];

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "CREDIT",
  "DEBIT",
  "ADJUSTMENT",
  "REFUND",
  "REVERSAL",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "approved",
  "available",
  "paid",
  "reversed",
]);

export const referralAttributionKindEnum = pgEnum("referral_attribution_kind", [
  "click",
  "signup",
  "order",
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
    status: partnerStatusEnum("status").notNull().default("pending"),
    modes: jsonb("modes").$type<PartnerMode[]>().notNull().default(["REFERRAL"]),
    allowNegativeBalance: boolean("allow_negative_balance").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("partners_slug_idx").on(table.slug),
    index("partners_status_idx").on(table.status),
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
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
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
    balanceMinor: bigint("balance_minor", { mode: "bigint" }).notNull().default(0n),
    currency: text("currency").notNull().default("USD"),
    ...timestamps,
  },
  (table) => [index("wallets_partner_id_idx").on(table.partnerId)],
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    type: walletTransactionTypeEnum("type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    ...timestamps,
  },
  (table) => [
    unique("wallet_tx_wallet_idempotency_unique").on(table.walletId, table.idempotencyKey),
    index("wallet_transactions_wallet_id_idx").on(table.walletId),
    index("wallet_transactions_created_at_idx").on(table.createdAt),
  ],
);

/** Referral codes — reusable. Attribution lives in referral_attributions. */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    code: text("code").notNull().unique(),
    label: text("label"),
    ...timestamps,
  },
  (table) => [index("referrals_partner_id_idx").on(table.partnerId)],
);

export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => referrals.id, { onDelete: "restrict" }),
    kind: referralAttributionKindEnum("kind").notNull(),
    visitorHash: text("visitor_hash"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("referral_attributions_partner_id_idx").on(table.partnerId),
    uniqueIndex("referral_attributions_signup_user_unique")
      .on(table.userId)
      .where(sql`${table.kind} = 'signup' AND ${table.userId} IS NOT NULL`),
    uniqueIndex("referral_attributions_order_unique")
      .on(table.orderId)
      .where(sql`${table.kind} = 'order' AND ${table.orderId} IS NOT NULL`),
    uniqueIndex("referral_attributions_click_visitor_unique")
      .on(table.referralId, table.visitorHash)
      .where(sql`${table.kind} = 'click' AND ${table.visitorHash} IS NOT NULL`),
  ],
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    status: commissionStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    index("commissions_partner_id_idx").on(table.partnerId),
    index("commissions_order_id_idx").on(table.orderId),
    uniqueIndex("commissions_partner_order_unique")
      .on(table.partnerId, table.orderId)
      .where(sql`${table.orderId} IS NOT NULL`),
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

export const partnerCustomers = pgTable(
  "partner_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    unique("partner_customer_partner_user_unique").on(table.partnerId, table.userId),
    index("partner_customers_partner_id_idx").on(table.partnerId),
  ],
);

export const partnerIssues = pgTable(
  "partner_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    customerUserId: text("customer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlements.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    kind: text("kind").notNull().default("issue"),
    idempotencyKey: text("idempotency_key").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("partner_issue_idempotency_unique").on(table.partnerId, table.idempotencyKey),
    index("partner_issues_partner_id_idx").on(table.partnerId),
    index("partner_issues_entitlement_id_idx").on(table.entitlementId),
  ],
);
