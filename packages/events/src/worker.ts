import type { OutboxWorkerOptions, OutboxWorkerResult } from "./types";

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_LOCK_TIMEOUT_MS = 300_000;

/** Dedicated outbox runner: reclaim stale locks, claim, dispatch, retry/fail. */
export class OutboxWorker {
  private readonly batchSize: number;
  private readonly lockTimeoutMs: number;
  private readonly now: () => Date;

  constructor(private readonly options: OutboxWorkerOptions) {
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
  }

  async runOnce(): Promise<OutboxWorkerResult> {
    const now = this.now();
    const reclaimed = await this.options.store.reclaimStaleLocks(this.lockTimeoutMs, now);
    const processed = await this.options.dispatcher.dispatchPending(this.batchSize);
    return { reclaimed, processed };
  }
}
