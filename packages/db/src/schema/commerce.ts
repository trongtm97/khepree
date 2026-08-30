import {
  bigint,
  check,
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
import { plans, prices, products } from "./catalog";
import { organizations, user } from "./identity";
import { timestamps } from "./_shared";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    userId: text("user_id").references(() => user.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (table) => [
    index("customers_user_id_idx").on(table.userId),
    index("customers_organization_id_idx").on(table.organizationId),
    uniqueIndex("customers_user_id_unique").on(table.userId).where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex("customers_organization_id_unique")
      .on(table.organizationId)
      .where(sql`${table.organizationId} IS NOT NULL`),
    check(
      "customers_exactly_one_owner",
      sql`(
        (${table.userId} IS NOT NULL AND ${table.organizationId} IS NULL)
        OR (${table.userId} IS NULL AND ${table.organizationId} IS NOT NULL)
      )`,
    ),
  ],
);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending_payment",
  "paid",
  "cancelled",
  "refunded",
  "partially_refunded",
  "voided",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("draft"),
    currency: text("currency").notNull(),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_public_id_idx").on(table.publicId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    priceId: uuid("price_id").references(() => prices.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitAmountMinor: bigint("unit_amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    planNameSnapshot: text("plan_name_snapshot").notNull(),
    billingIntervalSnapshot: text("billing_interval_snapshot"),
    accessTermDaysSnapshot: integer("access_term_days_snapshot"),
    ...timestamps,
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "voided",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    method: text("method"),
    providerSubscriptionId: text("provider_subscription_id"),
    ...timestamps,
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_status_idx").on(table.status),
    index("payments_created_at_idx").on(table.createdAt),
    uniqueIndex("payments_provider_payment_unique")
      .on(table.provider, table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
  ],
);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    priceId: uuid("price_id").references(() => prices.id, { onDelete: "restrict" }),
    provider: text("provider"),
    providerSubscriptionId: text("provider_subscription_id"),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("subscriptions_customer_id_idx").on(table.customerId),
    index("subscriptions_status_idx").on(table.status),
    uniqueIndex("subscriptions_provider_subscription_unique")
      .on(table.provider, table.providerSubscriptionId)
      .where(sql`${table.providerSubscriptionId} IS NOT NULL`),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("webhook_provider_event_unique").on(table.provider, table.eventId),
    index("webhook_events_created_at_idx").on(table.createdAt),
    index("webhook_events_event_id_idx").on(table.eventId),
  ],
);

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "succeeded",
  "failed",
  "manual_required",
]);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerRefundId: text("provider_refund_id"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    status: refundStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    initiatedBy: text("initiated_by"),
    ...timestamps,
  },
  (table) => [
    index("refunds_payment_id_idx").on(table.paymentId),
    uniqueIndex("refunds_provider_refund_unique")
      .on(table.provider, table.providerRefundId)
      .where(sql`${table.providerRefundId} IS NOT NULL`),
  ],
);

/** Valid order transitions — enforced by `@khepree/commerce`. */
export const ORDER_STATUS_TRANSITIONS = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["paid", "cancelled", "voided"],
  paid: ["refunded", "partially_refunded", "voided"],
  partially_refunded: ["refunded"],
  cancelled: [],
  refunded: [],
  voided: [],
} as const;

export const PAYMENT_STATUS_TRANSITIONS = {
  pending: ["succeeded", "failed", "voided"],
  succeeded: ["refunded", "voided"],
  failed: [],
  refunded: [],
  voided: [],
} as const;
