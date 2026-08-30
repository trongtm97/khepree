import { describe, expect, it } from "vitest";
import { outboxHealthNeedsAlert, type OutboxHealthMetrics } from "./outbox-metrics";

describe("outboxHealthNeedsAlert", () => {
  it("alerts when failed events exist", () => {
    const metrics: OutboxHealthMetrics = {
      pending: 0,
      processing: 0,
      failed: 1,
      oldestPendingAgeSeconds: null,
      lastWorkerRun: new Date().toISOString(),
    };
    expect(outboxHealthNeedsAlert(metrics)).toBe(true);
  });

  it("alerts when worker heartbeat is stale", () => {
    const metrics: OutboxHealthMetrics = {
      pending: 0,
      processing: 0,
      failed: 0,
      oldestPendingAgeSeconds: null,
      lastWorkerRun: new Date(Date.now() - 20 * 60_000).toISOString(),
    };
    expect(outboxHealthNeedsAlert(metrics)).toBe(true);
  });
});
