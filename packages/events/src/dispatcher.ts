import {
  COMMERCE_ORDER_PAID_V1,
  COMMERCE_ORDER_REFUNDED_V1,
  COMMERCE_ORDER_VOIDED_V1,
} from "./contracts";
import type { DispatcherOptions, DomainEventHandler, OutboxEventRecord, OutboxStore } from "./types";

const DEFAULT_MAX_ATTEMPTS = 12;
const DEFAULT_LOCK_TIMEOUT_MS = 300_000;
const BACKOFF_CAP_MS = 60 * 60_000;

export const CRITICAL_COMMERCE_EVENT_TYPES = [
  COMMERCE_ORDER_PAID_V1,
  COMMERCE_ORDER_REFUNDED_V1,
  COMMERCE_ORDER_VOIDED_V1,
] as const;

export function retryDelayMs(attempts: number): number {
  const exp = Math.min(Math.max(attempts, 0), 12);
  return Math.min(1000 * 2 ** exp, BACKOFF_CAP_MS);
}

export class PollingOutboxDispatcher {
  private readonly maxAttempts: number;
  private readonly lockTimeoutMs: number;
  private readonly now: () => Date;
  private readonly handlers: Map<string, DomainEventHandler[]>;
  private readonly immortal: Set<string>;

  constructor(private readonly options: DispatcherOptions) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
    this.handlers = new Map();
    for (const handler of options.handlers) {
      const list = this.handlers.get(handler.eventType) ?? [];
      list.push(handler);
      this.handlers.set(handler.eventType, list);
    }
    this.immortal = new Set(
      options.immortalEventTypes ?? [...CRITICAL_COMMERCE_EVENT_TYPES],
    );
  }

  get store(): OutboxStore {
    return this.options.store;
  }

  async dispatchPending(limit = 20): Promise<number> {
    const now = this.now();
    if (this.lockTimeoutMs > 0) {
      await this.options.store.reclaimStaleLocks(this.lockTimeoutMs, now);
    }
    const batch = await this.options.store.claimBatch(limit, now);
    let processed = 0;
    for (const event of batch) {
      await this.dispatchOne(event);
      processed += 1;
    }
    return processed;
  }

  private async dispatchOne(event: OutboxEventRecord): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    try {
      for (const handler of handlers) {
        await handler.handle(event);
      }
      await this.options.store.markProcessed(event.id, this.now());
    } catch (error) {
      const attempts = event.attempts + 1;
      const lastError = error instanceof Error ? error.message : String(error);
      const immortal = this.immortal.has(event.eventType);
      if (attempts >= this.maxAttempts && !immortal) {
        await this.options.store.markFailed(event.id, { attempts, lastError, now: this.now() });
        return;
      }
      await this.options.store.markRetry(event.id, {
        attempts,
        availableAt: new Date(this.now().getTime() + retryDelayMs(attempts)),
        lastError,
      });
    }
  }
}
