import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb, outboxEvents } from "@khepree/db";
import { COMMERCE_ORDER_PAID_V1, commerceOrderPaidEventId } from "./contracts";
import { DrizzleOutboxStore } from "./drizzle-store";
import { PollingOutboxDispatcher } from "./dispatcher";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("Drizzle outbox (Postgres)", () => {
  it("retries a paid event instead of marking FAILED", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const store = new DrizzleOutboxStore(db);
    const publicId = commerceOrderPaidEventId(`ord_${crypto.randomUUID()}`);
    await store.enqueue({
      publicId,
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: "ord_pg",
      payload: { orderPublicId: "ord_pg" },
    });

    const dispatcher = new PollingOutboxDispatcher({
      store,
      maxAttempts: 1,
      handlers: [
        {
          eventType: COMMERCE_ORDER_PAID_V1,
          async handle() {
            throw new Error("handler-down");
          },
        },
      ],
    });
    await dispatcher.dispatchPending();
    const row = await store.getByPublicId(publicId);
    expect(row?.status).toBe("PENDING");
    await db.delete(outboxEvents).where(eq(outboxEvents.publicId, publicId));
  });

  it("reclaims stale PROCESSING rows", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const store = new DrizzleOutboxStore(db);
    const publicId = commerceOrderPaidEventId(`ord_${crypto.randomUUID()}`);
    await store.enqueue({
      publicId,
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: "ord_stale_pg",
      payload: {},
    });
    const staleAt = new Date(Date.now() - 600_000);
    await db
      .update(outboxEvents)
      .set({ status: "PROCESSING", lockedAt: staleAt })
      .where(eq(outboxEvents.publicId, publicId));

    const reclaimed = await store.reclaimStaleLocks(300_000, new Date());
    expect(reclaimed).toBe(1);
    const row = await store.getByPublicId(publicId);
    expect(row?.status).toBe("PENDING");
    expect(row?.lockedAt).toBeNull();
    await db.delete(outboxEvents).where(eq(outboxEvents.publicId, publicId));
  });
});
