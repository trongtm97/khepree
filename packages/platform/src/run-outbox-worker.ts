import { closeDb } from "@khepree/db";
import { outboxPollIntervalMs } from "@khepree/events";
import type { OutboxWorker } from "@khepree/events";

export interface RunOutboxWorkerLoopOptions {
  worker: OutboxWorker;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onTick?: (result: { reclaimed: number; processed: number }) => void;
  onError?: (error: unknown) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Production outbox loop: runOnce → wait → retry until `signal` aborts. */
export async function runOutboxWorkerLoop(
  options: RunOutboxWorkerLoopOptions & { signal: AbortSignal },
): Promise<void> {
  const pollIntervalMs = options.pollIntervalMs ?? outboxPollIntervalMs();
  const sleep = options.sleep ?? defaultSleep;

  while (!options.signal.aborted) {
    try {
      const result = await options.worker.runOnce();
      options.onTick?.(result);
    } catch (error) {
      options.onError?.(error);
    }

    if (options.signal.aborted) break;
    await sleep(pollIntervalMs);
  }
}

export async function shutdownOutboxWorker(signal: string): Promise<void> {
  console.log(JSON.stringify({ event: "outbox_shutdown", signal }));
  await closeDb();
}
