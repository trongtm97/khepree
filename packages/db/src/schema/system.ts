import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./identity";
import { timestamps } from "./_shared";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    ...timestamps,
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    /** Opaque dedup key for programmatic notifications (e.g. "userId:campaignId:stage"). */
    resourceId: text("resource_id"),
    title: text("title").notNull(),
    body: text("body"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);

export const systemEvents = pgTable(
  "system_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull().default("info"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => [
    index("system_events_created_at_idx").on(table.createdAt),
    index("system_events_event_type_idx").on(table.eventType),
  ],
);
