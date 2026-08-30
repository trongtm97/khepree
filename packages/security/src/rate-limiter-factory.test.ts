import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRateLimiter, RedisRateLimiter } from "./rate-limit";
import * as redisClient from "./redis-client";

beforeEach(async () => {
  process.env.REDIS_URL = "";
  const { resetRateLimiterForTests } = await import("./rate-limiter-factory");
  await resetRateLimiterForTests();
});

afterEach(async () => {
  process.env.NODE_ENV = "test";
  process.env.REDIS_URL = "";
  const { resetRateLimiterForTests } = await import("./rate-limiter-factory");
  await resetRateLimiterForTests();
  vi.restoreAllMocks();
});

describe("getRateLimiter", () => {
  it("uses MemoryRateLimiter in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.REDIS_URL = "";
    const { getRateLimiter } = await import("./rate-limiter-factory");
    const limiter = await getRateLimiter();
    expect(limiter).toBeInstanceOf(MemoryRateLimiter);
    expect(limiter).not.toBeInstanceOf(RedisRateLimiter);
  });

  it("throws in production without REDIS_URL", async () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_URL = "";
    const { getRateLimiter } = await import("./rate-limiter-factory");
    await expect(getRateLimiter()).rejects.toThrow(/REDIS_URL/);
  });

  it("uses RedisRateLimiter in production when REDIS_URL is configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_URL = "redis://localhost:6379";
    vi.spyOn(redisClient, "createRedisCommands").mockResolvedValue({
      incr: async () => 1,
      pexpire: async () => 1,
    });
    const { getRateLimiter } = await import("./rate-limiter-factory");
    const limiter = await getRateLimiter();
    expect(limiter).toBeInstanceOf(RedisRateLimiter);
    expect(limiter).not.toBeInstanceOf(MemoryRateLimiter);
  });

  it("uses RedisRateLimiter when REDIS_URL is set outside production", async () => {
    process.env.NODE_ENV = "development";
    process.env.REDIS_URL = "redis://localhost:6379";
    vi.spyOn(redisClient, "createRedisCommands").mockResolvedValue({
      incr: async () => 1,
      pexpire: async () => 1,
    });
    const { getRateLimiter } = await import("./rate-limiter-factory");
    const limiter = await getRateLimiter();
    expect(limiter).toBeInstanceOf(RedisRateLimiter);
  });
});
