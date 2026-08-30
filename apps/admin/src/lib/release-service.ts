import { createReleaseService } from "@khepree/catalog";
import { createDrizzleAuditService, getDb } from "@khepree/db";

export function getReleaseService() {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return createReleaseService(db, createDrizzleAuditService(db));
}
