import { createClient } from "redis";
import type { RedisCommands } from "./rate-limit";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient> | null = null;

async function redisClient(url: string): Promise<RedisClient> {
  if (client?.isOpen) return client;
  if (!connectPromise) {
    connectPromise = (async () => {
      const next = createClient({ url });
      next.on("error", () => {
        /* ops: Redis client error — rate limit fails closed via RedisRateLimiter */
      });
      await next.connect();
      client = next;
      return next;
    })();
  }
  return connectPromise;
}

export async function createRedisCommands(url: string): Promise<RedisCommands> {
  const redis = await redisClient(url);
  return {
    incr: (key) => redis.incr(key),
    pexpire: (key, ms) => redis.pExpire(key, ms),
  };
}

export interface RedisSetCommands {
  set(key: string, value: string, options: { NX: true; EX: number }): Promise<string | null>;
}

export async function createRedisSetCommands(url: string): Promise<RedisSetCommands> {
  const redis = await redisClient(url);
  return {
    set: (key, value, options) => redis.set(key, value, options),
  };
}

/** Test-only. */
export async function closeRedisClientForTests(): Promise<void> {
  if (client?.isOpen) await client.quit();
  client = null;
  connectPromise = null;
}
