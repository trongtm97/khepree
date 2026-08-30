import { createClient } from "redis";

const OUTBOX_LAST_RUN_KEY = "khepree:observability:outbox:last_worker_run";

export async function recordOutboxWorkerRun(redisUrl: string): Promise<void> {
  const client = createClient({ url: redisUrl });
  await client.connect();
  try {
    await client.set(OUTBOX_LAST_RUN_KEY, new Date().toISOString());
  } finally {
    await client.disconnect();
  }
}

export async function getOutboxWorkerLastRun(redisUrl: string): Promise<string | null> {
  const client = createClient({ url: redisUrl });
  await client.connect();
  try {
    return await client.get(OUTBOX_LAST_RUN_KEY);
  } finally {
    await client.disconnect();
  }
}
