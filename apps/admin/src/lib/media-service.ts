import { createMediaService } from "@khepree/catalog";
import { getDb } from "@khepree/db";

export function getMediaService() {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return createMediaService(db);
}
