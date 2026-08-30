import { z } from "zod";

export type IntegrationStatus = "configured" | "not_configured" | "mock";

export const DEFAULT_CURRENCY = "VND";
export const DEFAULT_MARKET_REGION = "VN";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1).optional(),

  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: optionalUrl,

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_PUBLIC: z.string().optional(),
  R2_BUCKET_PRIVATE: z.string().optional(),
  R2_PUBLIC_BASE_URL: optionalUrl,

  LICENSE_SIGNING_PRIVATE_KEY: z.string().optional(),
  LICENSE_SIGNING_PUBLIC_KEY: z.string().optional(),

  EMAIL_FROM: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["dev", "resend"]).default("dev"),

  REDIS_URL: z.string().optional(),

  /** Stale PROCESSING outbox rows older than this are reclaimed (ms). Default 5 minutes. */
  OUTBOX_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  /** Max handler attempts before FAILED (non-immortal event types). */
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(12),
  /** Bearer secret for POST /api/v1/internal/outbox/run (cron / worker trigger). */
  OUTBOX_WORKER_SECRET: z.string().optional(),

  PAYMENT_PROVIDER: z.enum(["mock", "sepay"]).default("mock"),
  MOCK_PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  SEPAY_ENV: z.enum(["sandbox", "production"]).optional(),
  SEPAY_MERCHANT_ID: z.string().optional(),
  SEPAY_SECRET_KEY: z.string().optional(),
  /** Optional. When unset, IPN uses SEPAY_SECRET_KEY (official X-Secret-Key). */
  SEPAY_IPN_SECRET: z.string().optional(),

  /** none = ignore spoofable forwarding headers. cloudflare = CF-Connecting-IP only. */
  TRUSTED_PROXY: z.enum(["none", "cloudflare"]).default("none"),

  APP_URL: optionalUrl,
  WEB_URL: optionalUrl,
  ACCOUNT_URL: optionalUrl,
  ADMIN_URL: optionalUrl,
  PARTNER_URL: optionalUrl,
  API_URL: optionalUrl,
  STATUS_URL: optionalUrl,
  DOWNLOAD_URL: optionalUrl,
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(input: Record<string, string | undefined>): Env {
  return envSchema.parse(input);
}

/** Validated environment — never throws during Next.js build phase. */
export function getEnv(source: Record<string, string | undefined> = process.env): Env {
  return parseEnv(source);
}

export function isDatabaseConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.DATABASE_URL && !env.DATABASE_URL.includes("CHANGE_ME"));
}

export function isPublicStorageConfigured(env: Env = getEnv()): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_PUBLIC,
  );
}

export function isPrivateStorageConfigured(env: Env = getEnv()): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_PRIVATE,
  );
}

/** Both buckets configured — required for staging/production storage. */
export function isStorageConfigured(env: Env = getEnv()): boolean {
  return isPublicStorageConfigured(env) && isPrivateStorageConfigured(env);
}

export function isEmailConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.EMAIL_FROM && env.EMAIL_PROVIDER_API_KEY);
}

export function isLicenseSigningConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.LICENSE_SIGNING_PRIVATE_KEY && env.LICENSE_SIGNING_PUBLIC_KEY);
}

export function isMockPaymentConfigured(env: Env = getEnv()): boolean {
  return env.PAYMENT_PROVIDER === "mock";
}

export function isSePayConfigured(env: Env = getEnv()): boolean {
  return Boolean(
    env.PAYMENT_PROVIDER === "sepay" &&
      env.SEPAY_ENV &&
      env.SEPAY_MERCHANT_ID &&
      !env.SEPAY_MERCHANT_ID.includes("CHANGE_ME") &&
      env.SEPAY_SECRET_KEY &&
      !env.SEPAY_SECRET_KEY.includes("CHANGE_ME"),
  );
}

export function isRedisConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.REDIS_URL && !env.REDIS_URL.includes("CHANGE_ME"));
}

export function sepayIpnSecret(env: Env = getEnv()): string | undefined {
  if (env.SEPAY_IPN_SECRET && !env.SEPAY_IPN_SECRET.includes("CHANGE_ME")) {
    return env.SEPAY_IPN_SECRET;
  }
  if (env.SEPAY_SECRET_KEY && !env.SEPAY_SECRET_KEY.includes("CHANGE_ME")) {
    return env.SEPAY_SECRET_KEY;
  }
  return undefined;
}

export function integrationStatus(check: boolean): IntegrationStatus {
  if (check) return "configured";
  return process.env.NODE_ENV === "development" ? "mock" : "not_configured";
}

export { envSchema };
