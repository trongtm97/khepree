import { getDb, pingDatabase } from "@khepree/db";
import {
  getEnv,
  isDatabaseConfigured,
  isEmailConfigured,
  isLicenseSigningConfigured,
  isPrivateStorageConfigured,
  isPublicStorageConfigured,
  isRedisConfigured,
} from "@khepree/config";
import { pingRedis } from "@khepree/security/redis-health";

export const dynamic = "force-dynamic";

function configReady(env: ReturnType<typeof getEnv>): boolean {
  if (env.NODE_ENV !== "production") return true;
  return (
    isEmailConfigured(env) &&
    isLicenseSigningConfigured(env) &&
    isPublicStorageConfigured(env) &&
    isPrivateStorageConfigured(env)
  );
}

export async function GET() {
  const checks: Record<string, "ok" | "fail" | "skip"> = {};
  const env = getEnv();

  if (isDatabaseConfigured(env)) {
    const db = getDb();
    checks.database = db && (await pingDatabase(db)) ? "ok" : "fail";
  } else {
    checks.database = "skip";
  }

  if (isRedisConfigured(env)) {
    checks.redis = (await pingRedis(env.REDIS_URL!)) ? "ok" : "fail";
  } else if (env.NODE_ENV === "production") {
    checks.redis = "fail";
  } else {
    checks.redis = "skip";
  }

  checks.config = configReady(env) ? "ok" : "fail";

  const ready = !Object.values(checks).includes("fail");
  return Response.json({ status: ready ? "ok" : "fail", checks }, { status: ready ? 200 : 503 });
}
