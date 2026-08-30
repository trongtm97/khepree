import { and, eq, inArray, lte } from "drizzle-orm";
import { outboxEvents, withTransaction, type Database } from "@khepree/db";
import type { NewOutboxEvent, OutboxEventRecord, OutboxStatus, OutboxStore } from "./types";

export class DrizzleOutboxStore implements OutboxStore {
  constructor(private readonly db: Database) {}

  async enqueue(input: NewOutboxEvent): Promise<void> {
    try {
      await this.db.insert(outboxEvents).values({
        publicId: input.publicId,
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: input.payload,
        status: "PENDING",
      });
    } catch (error) {
      if (isUniqueViolation(error)) return;
      throw error;
    }
  }

  async claimBatch(limit: number, now: Date): Promise<OutboxEventRecord[]> {
    return withTransaction(this.db, async (tx) => {
      const rows = await tx
        .select()
        .from(outboxEvents)
        .where(and(eq(outboxEvents.status, "PENDING"), lte(outboxEvents.availableAt, now)))
        .orderBy(outboxEvents.availableAt)
        .limit(limit)
        .for("update", { skipLocked: true });

      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx
        .update(outboxEvents)
        .set({ status: "PROCESSING", lockedAt: now, updatedAt: now })
        .where(inArray(outboxEvents.id, ids));

      return rows.map((row) => mapOutbox({ ...row, status: "PROCESSING", lockedAt: now }));
    });
  }

  async markProcessed(id: string, now: Date): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({ status: "PROCESSED", processedAt: now, lockedAt: null, updatedAt: now })
      .where(eq(outboxEvents.id, id));
  }

  async markRetry(
    id: string,
    input: { attempts: number; availableAt: Date; lastError: string },
  ): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({
        status: "PENDING",
        attempts: input.attempts,
        availableAt: input.availableAt,
        lastError: input.lastError,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(outboxEvents.id, id));
  }

  async markFailed(
    id: string,
    input: { attempts: number; lastError: string; now: Date },
  ): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({
        status: "FAILED",
        attempts: input.attempts,
        lastError: input.lastError,
        lockedAt: null,
        updatedAt: input.now,
      })
      .where(eq(outboxEvents.id, id));
  }

  async getByPublicId(publicId: string): Promise<OutboxEventRecord | null> {
    const [row] = await this.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.publicId, publicId))
      .limit(1);
    return row ? mapOutbox(row) : null;
  }
}

function mapOutbox(row: typeof outboxEvents.$inferSelect): OutboxEventRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    payload: row.payload,
    status: row.status as OutboxStatus,
    attempts: row.attempts,
    availableAt: row.availableAt,
    lockedAt: row.lockedAt,
    processedAt: row.processedAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const record = current as { code?: string; cause?: unknown };
    if (record.code === "23505") return true;
    current = record.cause;
  }
  return /duplicate key|unique constraint/i.test(error instanceof Error ? error.message : String(error));
}
