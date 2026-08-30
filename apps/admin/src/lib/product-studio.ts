import { createProductStudioService } from "@khepree/catalog";
import { createDrizzleAuditService, getDb } from "@khepree/db";
import { getEnv } from "@khepree/config";

export function getProductStudio() {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const env = getEnv();
  const secret = env.BETTER_AUTH_SECRET ?? "dev-local-preview-secret-32chars!";
  return createProductStudioService(db, createDrizzleAuditService(db), secret);
}

export function webPreviewBaseUrl(): string {
  const env = getEnv();
  return env.APP_URL ?? "http://localhost:3000";
}
