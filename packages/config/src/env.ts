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

  /** Ed25519 SPKI (base64 DER) for release update manifest verification — public key only. */
  UPDATE_SIGNING_PUBLIC_KEY: z.string().optional(),
  /** Comma-separated trusted key IDs; defaults to key derived from UPDATE_SIGNING_PUBLIC_KEY. */
  UPDATE_SIGNING_TRUSTED_KEY_IDS: z.string().optional(),

  /** Comma-separated product UUIDs allowed to download updates without entitlement. */
  DESKTOP_PUBLIC_UPDATE_PRODUCT_IDS: z.string().optional(),

  /** When true, beta Squirrel feed endpoints are enabled. Alpha remains disabled. */
  SQUIRREL_BETA_FEED_ENABLED: z.enum(["true", "false"]).optional(),
  /** HMAC secret for Squirrel feed/artifact tickets — falls back to BETTER_AUTH_SECRET in dev. */
  SQUIRREL_UPDATE_TICKET_SECRET: z.string().optional(),

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

  /** SePay VietQR bank transfer (same model as CHAPMEE). */
  SEPAY_ENV: z.enum(["sandbox", "production"]).optional(),
  SEPAY_BANK_CODE: z.string().optional(),
  SEPAY_BANK_ACCOUNT_NUMBER: z.string().optional(),
  SEPAY_BANK_ACCOUNT_NAME: z.string().optional(),
  SEPAY_WEBHOOK_SECRET: z.string().optional(),
  SEPAY_API_KEY: z.string().optional(),
  SEPAY_WEBHOOK_AUTH: z.enum(["hmac_sha256", "api_key"]).default("hmac_sha256"),
  SEPAY_QR_BASE_URL: optionalUrl,
  /** Manual go-live ack — required with SEPAY_ENV=production (see verify-production-config.sh). */
  KHEPREE_ALLOW_SEPAY_PRODUCTION: z.string().optional(),

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
  const auth = env.SEPAY_WEBHOOK_AUTH ?? "hmac_sha256";
  const webhookReady =
    auth === "api_key"
      ? Boolean(env.SEPAY_API_KEY && !env.SEPAY_API_KEY.includes("CHANGE_ME"))
      : Boolean(env.SEPAY_WEBHOOK_SECRET && !env.SEPAY_WEBHOOK_SECRET.includes("CHANGE_ME"));
  return Boolean(
    env.PAYMENT_PROVIDER === "sepay" &&
      env.SEPAY_BANK_CODE &&
      !env.SEPAY_BANK_CODE.includes("CHANGE_ME") &&
      env.SEPAY_BANK_ACCOUNT_NUMBER &&
      !env.SEPAY_BANK_ACCOUNT_NUMBER.includes("CHANGE_ME") &&
      env.SEPAY_BANK_ACCOUNT_NAME &&
      !env.SEPAY_BANK_ACCOUNT_NAME.includes("CHANGE_ME") &&
      webhookReady,
  );
}

export function sepayWebhookSecret(env: Env = getEnv()): string | undefined {
  if (env.SEPAY_WEBHOOK_SECRET && !env.SEPAY_WEBHOOK_SECRET.includes("CHANGE_ME")) {
    return env.SEPAY_WEBHOOK_SECRET;
  }
  return undefined;
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
  return sepayWebhookSecret(env);
}

export function integrationStatus(check: boolean): IntegrationStatus {
  if (check) return "configured";
  return process.env.NODE_ENV === "development" ? "mock" : "not_configured";
}

export { envSchema };
