import { afterEach, describe, expect, it } from "vitest";
import {
  authRateLimitPolicy,
  consumeRateLimit,
  RATE_LIMITS,
  resetRateLimitStoreForTests,
} from "./rate-limit";

afterEach(() => {
  resetRateLimitStoreForTests();
});

describe("consumeRateLimit", () => {
  it("allows up to max hits then denies", () => {
    const policy = { name: "test", windowMs: 60_000, max: 2 };
    expect(consumeRateLimit("a", policy).ok).toBe(true);
    expect(consumeRateLimit("a", policy).ok).toBe(true);
    const denied = consumeRateLimit("a", policy);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const policy = RATE_LIMITS.LICENSE;
    expect(consumeRateLimit("ip-1", policy).ok).toBe(true);
    expect(consumeRateLimit("ip-2", policy).ok).toBe(true);
  });
});

describe("authRateLimitPolicy", () => {
  it("maps better-auth paths", () => {
    expect(authRateLimitPolicy("/api/auth/sign-in/email").name).toBe("auth.sign-in");
    expect(authRateLimitPolicy("/api/auth/sign-up/email").name).toBe("auth.sign-up");
    expect(authRateLimitPolicy("/api/auth/forget-password").name).toBe("auth.password");
    expect(authRateLimitPolicy("/api/auth/send-verification-email").name).toBe("auth.verify");
    expect(authRateLimitPolicy("/api/auth/ok").name).toBe("auth.generic");
  });
});
