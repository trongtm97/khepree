import { getEnv, isRedisConfigured } from "@khepree/config";
import { createRateLimiter, MemoryRateLimiter, type RateLimiter } from "./rate-limit";
import { closeRedisClientForTests, createRedisCommands } from "./redis-client";

const memoryLimiter = new MemoryRateLimiter();
let limiter: RateLimiter | null = null;
let limiterInit: Promise<RateLimiter> | null = null;

async function resolveRateLimiter(): Promise<RateLimiter> {
  const env = getEnv();
  if (isRedisConfigured(env)) {
    return createRateLimiter(await createRedisCommands(env.REDIS_URL!));
  }
  if (env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is required in production for shared rate limiting");
  }
  return memoryLimiter;
}

/** Configured limiter: Memory in dev/test; Redis in production when REDIS_URL is set. */
export async function getRateLimiter(): Promise<RateLimiter> {
  if (limiter) return limiter;
  if (!limiterInit) limiterInit = resolveRateLimiter();
  limiter = await limiterInit;
  return limiter;
}

/** Test-only. */
export async function resetRateLimiterForTests(): Promise<void> {
  memoryLimiter.reset();
  limiter = null;
  limiterInit = null;
  await closeRedisClientForTests();
}
