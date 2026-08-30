import { describe, expect, it } from "vitest";
import { MemoryOutboxStore } from "@khepree/events";
import { OutboxWorker } from "@khepree/events";
import { runOutboxWorkerLoop } from "./run-outbox-worker";

describe("runOutboxWorkerLoop", () => {
  it("polls until aborted", async () => {
    const store = new MemoryOutboxStore();
    const worker = new OutboxWorker({
      store,
      dispatcher: { dispatchPending: async () => 0 },
      batchSize: 5,
    });
    const ticks: number[] = [];
    const abort = new AbortController();

    const loop = runOutboxWorkerLoop({
      worker,
      pollIntervalMs: 1,
      signal: abort.signal,
      sleep: async () => {
        await new Promise<void>((resolve) => setImmediate(resolve));
      },
      onTick: () => {
        ticks.push(1);
        if (ticks.length >= 2) abort.abort();
      },
    });

    await loop;
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });
});
