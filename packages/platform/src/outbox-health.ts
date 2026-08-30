import { getEnv, isRedisConfigured } from "@khepree/config";
import { getDb } from "@khepree/db";
import { queryOutboxHealthMetrics, type OutboxHealthMetrics } from "@khepree/events";
import { getOutboxWorkerLastRun } from "@khepree/security/worker-heartbeat";

export async function fetchOutboxHealthMetrics(): Promise<OutboxHealthMetrics | null> {
  const db = getDb();
  if (!db) return null;

  const env = getEnv();
  const lastWorkerRun =
    isRedisConfigured(env) && env.REDIS_URL
      ? await getOutboxWorkerLastRun(env.REDIS_URL).catch(() => null)
      : null;

  return queryOutboxHealthMetrics(db, lastWorkerRun);
}
