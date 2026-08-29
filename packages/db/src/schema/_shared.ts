import { timestamp } from "drizzle-orm/pg-core";

/** Standard row timestamps — all domain tables use these. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** Optional soft delete — only on tables where retention policy allows hiding rows. */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
