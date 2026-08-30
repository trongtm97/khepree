import { z } from "zod";

export type IntegrationStatus = "configured" | "not_configured" | "mock";

export const DEFAULT_CURRENCY = "VND";
export const DEFAULT_MARKET_REGION = "VN";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1).optional(),
  /** Max connections per process (single-VPS default). */
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  /** postgres.js idle_timeout (seconds). */
  DATABASE_IDLE_TIMEOUT: z.coerce.number().int().nonnegative().default(20),
  /** postgres.js connect_timeout (seconds). */
  DATABASE_CONNECT_TIMEOUT: z.coerce.number().int().positive().default(10),

  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: optionalUrl,

  /** Google OAuth — server-only; optional identity login for account app. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /** Generic S3-compatible storage (Vietnix production). */
  STORAGE_PROVIDER: z.enum(["s3"]).optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_PUBLIC: z.string().optional(),
  S3_BUCKET_PRIVATE: z.string().optional(),
  S3_PUBLIC_BASE_URL: optionalUrl,
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  /** acl = per-object public-read (Vietnix default). none = bucket policy must grant public read. */
  S3_PUBLIC_ACCESS_MODE: z.enum(["acl", "none"]).optional(),

  LICENSE_SIGNING_PRIVATE_KEY: z.string().optional(),
  LICENSE_SIGNING_PUBLIC_KEY: z.string().optional(),

  EMAIL_FROM: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_REPLY_TO: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["dev", "resend", "smtp"]).default("dev"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),

  REDIS_URL: z.string().optional(),

  /** Stale PROCESSING outbox rows older than this are reclaimed (ms). Default 5 minutes. */
  OUTBOX_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  /** Max handler attempts before FAILED (non-immortal event types). */
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(12),
  /** Dedicated outbox worker poll interval (ms). */
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  /** Events claimed per outbox worker tick. */
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(20),
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

export {
  isPrivateStorageConfigured,
  isPublicStorageConfigured,
  isS3StorageConfigured,
  isStorageConfigured,
  resolvePublicAccessMode,
  resolvePublicMediaBaseUrl,
  resolveStorageCredentials,
  type ResolvedStorageCredentials,
  type S3PublicAccessMode,
} from "./storage-env";

export function mailFromAddress(env: Env = getEnv()): string | undefined {
  return env.MAIL_FROM?.trim() || env.EMAIL_FROM?.trim() || undefined;
}

export function isEmailConfigured(env: Env = getEnv()): boolean {
  const from = mailFromAddress(env);
  if (!from || from.includes("CHANGE_ME")) return false;
  if (env.EMAIL_PROVIDER === "resend") {
    return Boolean(env.EMAIL_PROVIDER_API_KEY && !env.EMAIL_PROVIDER_API_KEY.includes("CHANGE_ME"));
  }
  if (env.EMAIL_PROVIDER === "smtp") {
    return Boolean(
      env.SMTP_HOST &&
        !env.SMTP_HOST.includes("CHANGE_ME") &&
        env.SMTP_PORT &&
        env.SMTP_PORT > 0,
    );
  }
  return false;
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

/** True when Google OAuth credentials are present (identity scopes only). */
export function isGoogleAuthConfigured(
  source: Env | Record<string, string | undefined> = getEnv(),
): boolean {
  const clientId = source.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = source.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return false;
  if (clientId.includes("CHANGE_ME") || clientSecret.includes("CHANGE_ME")) return false;
  return true;
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
