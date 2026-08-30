import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authRateLimitPolicy,
  clientIp,
  consumeRateLimit,
  RATE_LIMITS,
  resetRateLimitStoreForTests,
} from "./rate-limit";

beforeEach(async () => {
  process.env.REDIS_URL = "";
  await resetRateLimitStoreForTests();
});

afterEach(async () => {
  process.env.REDIS_URL = "";
  await resetRateLimitStoreForTests();
});

describe("consumeRateLimit", () => {
  it("allows up to max hits then denies", async () => {
    const policy = { name: "test", windowMs: 60_000, max: 2 };
    expect((await consumeRateLimit("a", policy)).ok).toBe(true);
    expect((await consumeRateLimit("a", policy)).ok).toBe(true);
    const denied = await consumeRateLimit("a", policy);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates keys", async () => {
    const policy = RATE_LIMITS.LICENSE;
    expect((await consumeRateLimit("ip-1", policy)).ok).toBe(true);
    expect((await consumeRateLimit("ip-2", policy)).ok).toBe(true);
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

describe("clientIp", () => {
  it("ignores spoofable forwarding headers when TRUSTED_PROXY is none", () => {
    const previous = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = "none";
    const request = new Request("http://localhost/x", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" },
    });
    expect(clientIp(request)).toBe("unknown");
    process.env.TRUSTED_PROXY = previous;
  });

  it("uses CF-Connecting-IP when TRUSTED_PROXY=cloudflare", () => {
    const previous = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = "cloudflare";
    const request = new Request("http://localhost/x", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "cf-connecting-ip": "9.9.9.9",
      },
    });
    expect(clientIp(request)).toBe("9.9.9.9");
    process.env.TRUSTED_PROXY = previous;
  });
});
