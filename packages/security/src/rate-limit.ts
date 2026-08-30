export interface RateLimitPolicy {
  name: string;
  windowMs: number;
  max: number;
}

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type Bucket = { timestamps: number[] };

export interface RateLimiter {
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitDecision> | RateLimitDecision;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, policy: RateLimitPolicy): RateLimitDecision {
    try {
      const now = Date.now();
      const bucketKey = `${policy.name}:${key}`;
      const bucket = this.buckets.get(bucketKey) ?? { timestamps: [] };
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < policy.windowMs);
      if (bucket.timestamps.length >= policy.max) {
        const oldest = bucket.timestamps[0] ?? now;
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + policy.windowMs - now) / 1000));
        this.buckets.set(bucketKey, bucket);
        return { ok: false, retryAfterSeconds };
      }
      bucket.timestamps.push(now);
      this.buckets.set(bucketKey, bucket);
      return { ok: true };
    } catch {
      return { ok: false, retryAfterSeconds: 60 };
    }
  }

  reset(): void {
    this.buckets.clear();
  }
}

/** Redis fixed-window limiter. Inject commands; do not add a Redis client dependency here. */
export interface RedisCommands {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
}

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: RedisCommands) {}

  async consume(key: string, policy: RateLimitPolicy): Promise<RateLimitDecision> {
    try {
      const bucketKey = `rl:${policy.name}:${key}`;
      const count = await this.redis.incr(bucketKey);
      if (count === 1) await this.redis.pexpire(bucketKey, policy.windowMs);
      if (count > policy.max) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(policy.windowMs / 1000)) };
      }
      return { ok: true };
    } catch {
      return { ok: false, retryAfterSeconds: 60 };
    }
  }
}

const memoryLimiter = new MemoryRateLimiter();

export function createRateLimiter(redis?: RedisCommands): RateLimiter {
  if (redis) return new RedisRateLimiter(redis);
  return memoryLimiter;
}

export { memoryLimiter as memoryRateLimiterForTests };

export const RATE_LIMITS = {
  AUTH_SIGN_IN: { name: "auth.sign-in", windowMs: 15 * 60_000, max: 10 },
  AUTH_SIGN_UP: { name: "auth.sign-up", windowMs: 15 * 60_000, max: 5 },
  AUTH_PASSWORD: { name: "auth.password", windowMs: 15 * 60_000, max: 5 },
  AUTH_VERIFY: { name: "auth.verify", windowMs: 15 * 60_000, max: 10 },
  AUTH_GENERIC: { name: "auth.generic", windowMs: 60_000, max: 30 },
  LICENSE: { name: "license", windowMs: 60_000, max: 30 },
  WEBHOOK: { name: "webhook", windowMs: 60_000, max: 60 },
  MEDIA: { name: "media", windowMs: 60_000, max: 20 },
  SENSITIVE_MUTATION: { name: "mutation", windowMs: 60_000, max: 40 },
} as const satisfies Record<string, RateLimitPolicy>;

export function clientIp(request: Request): string {
  const trusted = process.env.TRUSTED_PROXY === "cloudflare" ? "cloudflare" : "none";
  if (trusted === "cloudflare") {
    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  // Do not trust client-supplied X-Forwarded-For / X-Real-IP.
  return "unknown";
}

export function authRateLimitPolicy(pathname: string): RateLimitPolicy {
  const path = pathname.toLowerCase();
  if (path.includes("sign-in")) return RATE_LIMITS.AUTH_SIGN_IN;
  if (path.includes("sign-up")) return RATE_LIMITS.AUTH_SIGN_UP;
  if (
    path.includes("forget-password") ||
    path.includes("forgot-password") ||
    path.includes("reset-password") ||
    path.includes("request-password")
  ) {
    return RATE_LIMITS.AUTH_PASSWORD;
  }
  if (path.includes("verify") || path.includes("send-verification")) {
    return RATE_LIMITS.AUTH_VERIFY;
  }
  return RATE_LIMITS.AUTH_GENERIC;
}

/**
 * Record a hit. Fail closed: any unexpected limiter error is treated as deny.
 */
export async function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitDecision> {
  const { getRateLimiter } = await import("./rate-limiter-factory");
  try {
    return await getRateLimiter().then((limiter) => limiter.consume(key, policy));
  } catch {
    return { ok: false, retryAfterSeconds: 60 };
  }
}

export function rateLimitedResponse(retryAfterSeconds: number, requestId?: string): Response {
  return new Response(
    JSON.stringify({
      error: { code: "RATE_LIMITED", message: "Too many requests", requestId },
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfterSeconds),
      },
    },
  );
}

export async function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  extraKey = "",
): Promise<Response | null> {
  const key = `${clientIp(request)}:${new URL(request.url).pathname}:${extraKey}`;
  const decision = await consumeRateLimit(key, policy);
  if (decision.ok) return null;
  const requestId = request.headers.get("x-request-id") ?? undefined;
  return rateLimitedResponse(decision.retryAfterSeconds, requestId);
}

/** Test-only. */
export async function resetRateLimitStoreForTests(): Promise<void> {
  const { resetRateLimiterForTests } = await import("./rate-limiter-factory");
  await resetRateLimiterForTests();
}
