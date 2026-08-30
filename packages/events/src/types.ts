export type OutboxStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";

export interface OutboxEventRecord {
  id: string;
  publicId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  availableAt: Date;
  lockedAt: Date | null;
  processedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewOutboxEvent {
  publicId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface OutboxStore {
  enqueue(input: NewOutboxEvent): Promise<void>;
  /** PROCESSING rows with lockedAt older than lockTimeoutMs become reclaimable PENDING. */
  reclaimStaleLocks(lockTimeoutMs: number, now: Date): Promise<number>;
  claimBatch(limit: number, now: Date): Promise<OutboxEventRecord[]>;
  markProcessed(id: string, now: Date): Promise<void>;
  markRetry(id: string, input: { attempts: number; availableAt: Date; lastError: string }): Promise<void>;
  markFailed(id: string, input: { attempts: number; lastError: string; now: Date }): Promise<void>;
  getByPublicId(publicId: string): Promise<OutboxEventRecord | null>;
}

export interface DomainEventHandler {
  eventType: string;
  handle(event: OutboxEventRecord): Promise<void>;
}

export interface DispatcherOptions {
  store: OutboxStore;
  handlers: DomainEventHandler[];
  maxAttempts?: number;
  /** Reclaim PROCESSING rows with lockedAt older than this (ms). Default 300_000. */
  lockTimeoutMs?: number;
  now?: () => Date;
  /** Critical event types never stay FAILED; they retry with capped backoff. */
  immortalEventTypes?: string[];
}

export interface OutboxWorkerResult {
  reclaimed: number;
  processed: number;
}

export interface OutboxWorkerOptions {
  store: OutboxStore;
  dispatcher: { dispatchPending(limit?: number): Promise<number> };
  batchSize?: number;
  lockTimeoutMs?: number;
  now?: () => Date;
}
