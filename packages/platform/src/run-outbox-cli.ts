#!/usr/bin/env tsx
/**
 * Dedicated outbox worker process. Requires DATABASE_URL and applied migrations.
 * Usage: pnpm outbox:run
 */
import { getEnv, isRedisConfigured, createLogger, emitAlert } from "@khepree/config";
import { getDb } from "@khepree/db";
import { recordOutboxWorkerRun } from "@khepree/security/worker-heartbeat";
import { createKhepreeOutboxWorker } from "./create-outbox-worker";
import { runOutboxWorkerLoop, shutdownOutboxWorker } from "./run-outbox-worker";

const log = createLogger("outbox-worker");

async function main(): Promise<void> {
  if (!getDb()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const worker = createKhepreeOutboxWorker();
  const abort = new AbortController();

  const stop = (signal: string) => {
    if (abort.signal.aborted) return;
    abort.abort();
    void shutdownOutboxWorker(signal).then(() => process.exit(0));
  };

  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  await runOutboxWorkerLoop({
    worker,
    signal: abort.signal,
    onTick: async (result) => {
      const env = getEnv();
      if (isRedisConfigured(env) && env.REDIS_URL) {
        await recordOutboxWorkerRun(env.REDIS_URL).catch((error) => {
          log.warn({
            event: "outbox_worker_heartbeat_failed",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
      log.info({ event: "outbox_worker_tick", ...result });
      if (result.processed === 0 && result.reclaimed > 0) {
        emitAlert("warn", "outbox_stale_locks_reclaimed", { reclaimed: result.reclaimed });
      }
    },
    onError: (error) => {
      emitAlert("error", "outbox_worker_tick_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await shutdownOutboxWorker("fatal");
  process.exit(1);
});
