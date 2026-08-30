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
import { timestamps } from "./_shared";

export const outboxStatusEnum = pgEnum("outbox_status", [
  "PENDING",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
]);

/** Durable side-effect queue. Critical domain transitions insert a row in the same transaction. */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: outboxStatusEnum("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    index("outbox_events_poll_idx").on(table.status, table.availableAt),
    index("outbox_events_aggregate_idx").on(table.aggregateType, table.aggregateId),
    index("outbox_events_event_type_idx").on(table.eventType),
  ],
);
