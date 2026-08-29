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
import { user } from "./identity";
import { timestamps } from "./_shared";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [index("customers_user_id_idx").on(table.userId)],
);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    currency: text("currency").notNull(),
    totalMinor: integer("total_minor").notNull(),
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
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitAmountMinor: integer("unit_amount_minor").notNull(),
    ...timestamps,
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
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
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    ...timestamps,
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_status_idx").on(table.status),
    index("payments_created_at_idx").on(table.createdAt),
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
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("subscriptions_customer_id_idx").on(table.customerId),
    index("subscriptions_status_idx").on(table.status),
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
