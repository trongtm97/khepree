import type { Env } from "./env";
import {
  getEnv,
  isDatabaseConfigured,
  isEmailConfigured,
  isLicenseSigningConfigured,
  isPrivateStorageConfigured,
  isPublicStorageConfigured,
  isRedisConfigured,
  isSePayConfigured,
  mailFromAddress,
} from "./env";

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

function requireValue(label: string, value: string | undefined): string {
  if (!value || value.includes("CHANGE_ME")) {
    throw new EnvValidationError(`${label} is required in production`);
  }
  return value;
}

export function isNextBuildPhase(source: NodeJS.ProcessEnv = process.env): boolean {
  return source.NEXT_PHASE === "phase-production-build";
}

export function validatePaymentProviderConfiguration(env: Env = getEnv()): void {
  if (env.PAYMENT_PROVIDER === "mock") {
    if (env.NODE_ENV === "production") {
      throw new EnvValidationError("PAYMENT_PROVIDER=mock is not allowed in production");
    }
    return;
  }
  if (env.PAYMENT_PROVIDER === "sepay") {
    if (!isSePayConfigured(env)) {
      throw new EnvValidationError(
        "SEPAY_ENV, SEPAY_MERCHANT_ID, and SEPAY_SECRET_KEY are required when PAYMENT_PROVIDER=sepay",
      );
    }
    return;
  }
  throw new EnvValidationError(`Unknown payment provider: ${env.PAYMENT_PROVIDER}`);
}

function validateProductionEmail(env: Env): void {
  if (env.EMAIL_PROVIDER === "dev" || !isEmailConfigured(env)) {
    throw new EnvValidationError(
      "Production email requires EMAIL_PROVIDER=resend|smtp with complete configuration",
    );
  }

  requireValue("MAIL_FROM or EMAIL_FROM", mailFromAddress(env));

  if (env.EMAIL_PROVIDER === "resend") {
    requireValue("EMAIL_PROVIDER_API_KEY", env.EMAIL_PROVIDER_API_KEY);
    return;
  }

  if (env.EMAIL_PROVIDER === "smtp") {
    requireValue("SMTP_HOST", env.SMTP_HOST);
    if (!env.SMTP_PORT || env.SMTP_PORT <= 0) {
      throw new EnvValidationError("SMTP_PORT is required in production when EMAIL_PROVIDER=smtp");
    }
    return;
  }

  throw new EnvValidationError(`Unsupported EMAIL_PROVIDER in production: ${env.EMAIL_PROVIDER}`);
}

/** Fail fast when production-critical configuration is missing. Skips `next build`. */
export function validateRuntimeEnv(env: Env = getEnv()): void {
  if (isNextBuildPhase()) return;
  if (env.NODE_ENV !== "production") return;

  requireValue("DATABASE_URL", env.DATABASE_URL);
  if (!isDatabaseConfigured(env)) {
    throw new EnvValidationError("DATABASE_URL is not configured");
  }

  requireValue("BETTER_AUTH_SECRET", env.BETTER_AUTH_SECRET);
  requireValue("BETTER_AUTH_URL", env.BETTER_AUTH_URL);
  requireValue("WEB_URL", env.WEB_URL);
  requireValue("ACCOUNT_URL", env.ACCOUNT_URL);
  requireValue("ADMIN_URL", env.ADMIN_URL);
  requireValue("PARTNER_URL", env.PARTNER_URL);
  requireValue("API_URL", env.API_URL);

  if (!isPublicStorageConfigured(env) || !isPrivateStorageConfigured(env)) {
    throw new EnvValidationError(
      "S3 or R2 public and private bucket configuration is required in production",
    );
  }

  if (!isLicenseSigningConfigured(env)) {
    throw new EnvValidationError("LICENSE_SIGNING_PRIVATE_KEY and LICENSE_SIGNING_PUBLIC_KEY are required in production");
  }

  validateProductionEmail(env);

  validatePaymentProviderConfiguration(env);
  if (!isRedisConfigured(env)) {
    throw new EnvValidationError("REDIS_URL is required in production for shared rate limiting");
  }
}
