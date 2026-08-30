#!/usr/bin/env tsx
/**
 * Dedicated outbox worker process. Requires DATABASE_URL and applied migrations.
 * Usage: pnpm outbox:run
 */
import { getDb } from "@khepree/db";
import { createKhepreeOutboxWorker } from "./create-outbox-worker";

async function main(): Promise<void> {
  if (!getDb()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const result = await createKhepreeOutboxWorker().runOnce();
  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
