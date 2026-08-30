import type { NewOutboxEvent, OutboxEventRecord, OutboxStore } from "./types";

export class MemoryOutboxStore implements OutboxStore {
  readonly events: OutboxEventRecord[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  async enqueue(input: NewOutboxEvent): Promise<void> {
    const existing = this.events.find((row) => row.publicId === input.publicId);
    if (existing) return;
    const timestamp = this.now();
    this.events.push({
      id: crypto.randomUUID(),
      publicId: input.publicId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      status: "PENDING",
      attempts: 0,
      availableAt: timestamp,
      lockedAt: null,
      processedAt: null,
      lastError: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async claimBatch(limit: number, now: Date): Promise<OutboxEventRecord[]> {
    const claimed: OutboxEventRecord[] = [];
    for (const row of this.events) {
      if (claimed.length >= limit) break;
      if (row.status !== "PENDING") continue;
      if (row.availableAt > now) continue;
      row.status = "PROCESSING";
      row.lockedAt = now;
      row.updatedAt = now;
      claimed.push(row);
    }
    return claimed;
  }

  async markProcessed(id: string, now: Date): Promise<void> {
    const row = this.events.find((item) => rowId(item, id));
    if (!row) return;
    row.status = "PROCESSED";
    row.processedAt = now;
    row.lockedAt = null;
    row.updatedAt = now;
  }

  async markRetry(
    id: string,
    input: { attempts: number; availableAt: Date; lastError: string },
  ): Promise<void> {
    const row = this.events.find((item) => rowId(item, id));
    if (!row) return;
    row.status = "PENDING";
    row.attempts = input.attempts;
    row.availableAt = input.availableAt;
    row.lastError = input.lastError;
    row.lockedAt = null;
    row.updatedAt = this.now();
  }

  async markFailed(
    id: string,
    input: { attempts: number; lastError: string; now: Date },
  ): Promise<void> {
    const row = this.events.find((item) => rowId(item, id));
    if (!row) return;
    row.status = "FAILED";
    row.attempts = input.attempts;
    row.lastError = input.lastError;
    row.lockedAt = null;
    row.updatedAt = input.now;
  }

  async getByPublicId(publicId: string): Promise<OutboxEventRecord | null> {
    return this.events.find((row) => row.publicId === publicId) ?? null;
  }
}

function rowId(row: OutboxEventRecord, id: string): boolean {
  return row.id === id;
}
