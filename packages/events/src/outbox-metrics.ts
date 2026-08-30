import { count, eq, inArray, min } from "drizzle-orm";
import { outboxEvents, type Database } from "@khepree/db";

export interface OutboxHealthMetrics {
  pending: number;
  processing: number;
  failed: number;
  oldestPendingAgeSeconds: number | null;
  lastWorkerRun: string | null;
}

export async function queryOutboxHealthMetrics(
  db: Database,
  lastWorkerRun: string | null = null,
): Promise<OutboxHealthMetrics> {
  const rows = await db
    .select({
      status: outboxEvents.status,
      total: count(),
    })
    .from(outboxEvents)
    .where(inArray(outboxEvents.status, ["PENDING", "PROCESSING", "FAILED"]))
    .groupBy(outboxEvents.status);

  const totals = new Map(rows.map((row) => [row.status, Number(row.total)]));
  const [oldest] = await db
    .select({ oldest: min(outboxEvents.availableAt) })
    .from(outboxEvents)
    .where(eq(outboxEvents.status, "PENDING"));

  const oldestAt = oldest?.oldest ?? null;
  const oldestPendingAgeSeconds =
    oldestAt instanceof Date ? Math.max(0, Math.floor((Date.now() - oldestAt.getTime()) / 1000)) : null;

  return {
    pending: totals.get("PENDING") ?? 0,
    processing: totals.get("PROCESSING") ?? 0,
    failed: totals.get("FAILED") ?? 0,
    oldestPendingAgeSeconds,
    lastWorkerRun,
  };
}

/** Alert when failed outbox events exist or pending queue is stale. */
export function outboxHealthNeedsAlert(metrics: OutboxHealthMetrics): boolean {
  if (metrics.failed > 0) return true;
  if (metrics.oldestPendingAgeSeconds !== null && metrics.oldestPendingAgeSeconds > 3600) return true;
  if (metrics.lastWorkerRun) {
    const ageMs = Date.now() - Date.parse(metrics.lastWorkerRun);
    if (!Number.isNaN(ageMs) && ageMs > 15 * 60_000) return true;
  }
  return false;
}
