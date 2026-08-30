import { describe, expect, it } from "vitest";
import { MemoryOutboxStore } from "./memory-store";
import { OutboxWorker } from "./worker";
import { PollingOutboxDispatcher } from "./dispatcher";
import { COMMERCE_ORDER_PAID_V1, commerceOrderPaidEventId } from "./contracts";

describe("OutboxWorker", () => {
  it("reclaims stale PROCESSING locks before dispatching", async () => {
    const clock = new Date("2026-08-30T12:00:00.000Z");
    const store = new MemoryOutboxStore(() => clock);
    await store.enqueue({
      publicId: commerceOrderPaidEventId("ord_stale"),
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: "ord_stale",
      payload: {},
    });
    const row = (await store.getByPublicId(commerceOrderPaidEventId("ord_stale")))!;
    row.status = "PROCESSING";
    row.lockedAt = new Date(clock.getTime() - 600_000);

    const seen: string[] = [];
    const dispatcher = new PollingOutboxDispatcher({
      store,
      lockTimeoutMs: 300_000,
      now: () => clock,
      handlers: [
        {
          eventType: COMMERCE_ORDER_PAID_V1,
          async handle(event) {
            seen.push(event.publicId);
          },
        },
      ],
    });
    const worker = new OutboxWorker({
      store,
      dispatcher,
      lockTimeoutMs: 300_000,
      now: () => clock,
    });

    const result = await worker.runOnce();
    expect(result.reclaimed).toBe(1);
    expect(result.processed).toBe(1);
    expect(seen).toEqual([commerceOrderPaidEventId("ord_stale")]);
  });
});
