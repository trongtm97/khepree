import type { Env } from "./env";
import {
  getEnv,
  isDatabaseConfigured,
  isEmailConfigured,
  isLicenseSigningConfigured,
  isPrivateStorageConfigured,
  isPublicStorageConfigured,
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
  requireValue("APP_URL", env.APP_URL);
  requireValue("ACCOUNT_URL", env.ACCOUNT_URL);
  requireValue("ADMIN_URL", env.ADMIN_URL);
  requireValue("PARTNER_URL", env.PARTNER_URL);
  requireValue("API_URL", env.API_URL);

  if (!isPublicStorageConfigured(env) || !isPrivateStorageConfigured(env)) {
    throw new EnvValidationError(
      "R2 public and private bucket configuration is required in production",
    );
  }

  if (!isLicenseSigningConfigured(env)) {
    throw new EnvValidationError("LICENSE_SIGNING_PRIVATE_KEY and LICENSE_SIGNING_PUBLIC_KEY are required in production");
  }

  if (!isEmailConfigured(env)) {
    throw new EnvValidationError("EMAIL_FROM and EMAIL_PROVIDER_API_KEY are required in production");
  }

  requireValue("MOCK_PAYMENT_WEBHOOK_SECRET", env.MOCK_PAYMENT_WEBHOOK_SECRET);
}
