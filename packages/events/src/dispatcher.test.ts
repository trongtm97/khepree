import { describe, expect, it } from "vitest";
import {
  COMMERCE_ORDER_PAID_V1,
  commerceOrderPaidEventId,
} from "./contracts";
import { PollingOutboxDispatcher, retryDelayMs } from "./dispatcher";
import { MemoryOutboxStore } from "./memory-store";

describe("PollingOutboxDispatcher", () => {
  it("processes handlers and marks PROCESSED", async () => {
    const store = new MemoryOutboxStore();
    const seen: string[] = [];
    await store.enqueue({
      publicId: commerceOrderPaidEventId("ord_1"),
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: "ord_1",
      payload: { orderPublicId: "ord_1" },
    });
    const dispatcher = new PollingOutboxDispatcher({
      store,
      handlers: [
        {
          eventType: COMMERCE_ORDER_PAID_V1,
          async handle(event) {
            seen.push(event.publicId);
          },
        },
      ],
    });
    expect(await dispatcher.dispatchPending()).toBe(1);
    expect(seen).toEqual([commerceOrderPaidEventId("ord_1")]);
    expect((await store.getByPublicId(commerceOrderPaidEventId("ord_1")))?.status).toBe("PROCESSED");
  });

  it("retries on handler failure and keeps paid events pending", async () => {
    const store = new MemoryOutboxStore();
    await store.enqueue({
      publicId: commerceOrderPaidEventId("ord_retry"),
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: "ord_retry",
      payload: { orderPublicId: "ord_retry" },
    });
    const dispatcher = new PollingOutboxDispatcher({
      store,
      maxAttempts: 2,
      handlers: [
        {
          eventType: COMMERCE_ORDER_PAID_V1,
          async handle() {
            throw new Error("provision-failed");
          },
        },
      ],
    });
    await dispatcher.dispatchPending();
    const row = await store.getByPublicId(commerceOrderPaidEventId("ord_retry"));
    expect(row?.status).toBe("PENDING");
    expect(row?.attempts).toBe(1);
    expect(row?.lastError).toBe("provision-failed");
  });

  it("never permanently fails commerce.order.paid", async () => {
    const clock = new Date("2026-08-30T00:00:00.000Z");
    const store = new MemoryOutboxStore(() => clock);
    await store.enqueue({
      publicId: commerceOrderPaidEventId("ord_immortal"),
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: "ord_immortal",
      payload: { orderPublicId: "ord_immortal" },
    });
    const dispatcher = new PollingOutboxDispatcher({
      store,
      maxAttempts: 1,
      now: () => clock,
      handlers: [
        {
          eventType: COMMERCE_ORDER_PAID_V1,
          async handle() {
            throw new Error("still-broken");
          },
        },
      ],
    });
    await dispatcher.dispatchPending();
    const row = await store.getByPublicId(commerceOrderPaidEventId("ord_immortal"));
    expect(row?.status).toBe("PENDING");
    expect(row?.attempts).toBe(1);
  });

  it("marks non-critical events FAILED after max attempts", async () => {
    const store = new MemoryOutboxStore();
    await store.enqueue({
      publicId: "evt_email_1",
      eventType: "notify.email.v1",
      aggregateType: "order",
      aggregateId: "ord_x",
      payload: {},
    });
    const dispatcher = new PollingOutboxDispatcher({
      store,
      maxAttempts: 1,
      immortalEventTypes: [],
      handlers: [
        {
          eventType: "notify.email.v1",
          async handle() {
            throw new Error("smtp-down");
          },
        },
      ],
    });
    await dispatcher.dispatchPending();
    expect((await store.getByPublicId("evt_email_1"))?.status).toBe("FAILED");
  });

  it("caps backoff at one hour", () => {
    expect(retryDelayMs(1)).toBe(2000);
    expect(retryDelayMs(20)).toBe(60 * 60_000);
  });
});
