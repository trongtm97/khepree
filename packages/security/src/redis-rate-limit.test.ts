import { describe, expect, it } from "vitest";
import { RATE_LIMITS, RedisRateLimiter } from "./rate-limit";

describe("RedisRateLimiter", () => {
  it("uses a shared counter store", async () => {
    const counts = new Map<string, number>();
    const limiter = new RedisRateLimiter({
      async incr(key) {
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        return next;
      },
      async pexpire() {
        return 1;
      },
    });
    const policy = { name: "redis-test", windowMs: 60_000, max: 2 };
    expect((await limiter.consume("k", policy)).ok).toBe(true);
    expect((await limiter.consume("k", policy)).ok).toBe(true);
    expect((await limiter.consume("k", policy)).ok).toBe(false);
    expect(RATE_LIMITS.WEBHOOK.max).toBeGreaterThan(0);
  });
});
