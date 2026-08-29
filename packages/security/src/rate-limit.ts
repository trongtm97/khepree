export interface RateLimitPolicy {
  name: string;
  windowMs: number;
  max: number;
}

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type Bucket = { timestamps: number[] };

// ponytail: in-memory sliding window is per-process. Multi-instance production
// should swap this Map for Redis (same consumeRateLimit signature).
const buckets = new Map<string, Bucket>();

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
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
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
export function consumeRateLimit(key: string, policy: RateLimitPolicy): RateLimitDecision {
  try {
    const now = Date.now();
    const bucketKey = `${policy.name}:${key}`;
    const bucket = buckets.get(bucketKey) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < policy.windowMs);
    if (bucket.timestamps.length >= policy.max) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + policy.windowMs - now) / 1000));
      buckets.set(bucketKey, bucket);
      return { ok: false, retryAfterSeconds };
    }
    bucket.timestamps.push(now);
    buckets.set(bucketKey, bucket);
    return { ok: true };
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

export function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  extraKey = "",
): Response | null {
  const key = `${clientIp(request)}:${new URL(request.url).pathname}:${extraKey}`;
  const decision = consumeRateLimit(key, policy);
  if (decision.ok) return null;
  const requestId = request.headers.get("x-request-id") ?? undefined;
  return rateLimitedResponse(decision.retryAfterSeconds, requestId);
}

/** Test-only. */
export function resetRateLimitStoreForTests(): void {
  buckets.clear();
}
