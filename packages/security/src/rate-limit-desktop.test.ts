import { describe, expect, it } from "vitest";
import { MemoryRateLimiter, RATE_LIMITS } from "./rate-limit";

describe("desktop rate limits", () => {
  const policies = [
    "DESKTOP_AUTHORIZE",
    "DESKTOP_EXCHANGE",
    "DESKTOP_ACTIVATE",
    "DESKTOP_REFRESH",
    "DESKTOP_HEARTBEAT",
    "DESKTOP_LOGOUT",
    "DESKTOP_ME",
    "DESKTOP_CHECKOUT",
  ] as const;

  it("defines policies for all desktop routes", () => {
    for (const key of policies) {
      expect(RATE_LIMITS[key].name).toMatch(/^desktop\./);
      expect(RATE_LIMITS[key].max).toBeGreaterThan(0);
    }
  });

  it("blocks excessive refresh attempts", () => {
    const limiter = new MemoryRateLimiter();
    const policy = RATE_LIMITS.DESKTOP_REFRESH;
    for (let i = 0; i < policy.max; i += 1) {
      expect(limiter.consume("ip-1", policy).ok).toBe(true);
    }
    expect(limiter.consume("ip-1", policy).ok).toBe(false);
  });
});
