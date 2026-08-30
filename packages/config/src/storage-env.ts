import type { Env } from "./env";
import { getEnv } from "./env";

export type StorageCredentialSource = "s3" | "r2";

export interface ResolvedStorageCredentials {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket?: string;
  privateBucket?: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
  source: StorageCredentialSource;
}

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes("CHANGE_ME");
}

/** Generic S3-compatible storage (Vietnix, MinIO, etc.). */
export function isS3StorageConfigured(env: Env): boolean {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY &&
      !isPlaceholder(env.S3_ENDPOINT) &&
      !isPlaceholder(env.S3_ACCESS_KEY_ID) &&
      !isPlaceholder(env.S3_SECRET_ACCESS_KEY),
  );
}

/** Legacy Cloudflare R2 env shape — still supported when S3_* is unset. */
export function isR2StorageConfigured(env: Env): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      !isPlaceholder(env.R2_ACCOUNT_ID) &&
      !isPlaceholder(env.R2_ACCESS_KEY_ID) &&
      !isPlaceholder(env.R2_SECRET_ACCESS_KEY),
  );
}

export function resolveStorageCredentials(env: Env = getEnv()): ResolvedStorageCredentials | null {
  if (isS3StorageConfigured(env)) {
    return {
      endpoint: env.S3_ENDPOINT!,
      region: env.S3_REGION?.trim() || "auto",
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      publicBucket: env.S3_BUCKET_PUBLIC,
      privateBucket: env.S3_BUCKET_PRIVATE,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
      source: "s3",
    };
  }

  if (isR2StorageConfigured(env)) {
    return {
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      publicBucket: env.R2_BUCKET_PUBLIC,
      privateBucket: env.R2_BUCKET_PRIVATE,
      publicBaseUrl: env.R2_PUBLIC_BASE_URL,
      forcePathStyle: false,
      source: "r2",
    };
  }

  return null;
}

export function isPublicStorageConfigured(env: Env = getEnv()): boolean {
  const creds = resolveStorageCredentials(env);
  return Boolean(creds?.publicBucket && !isPlaceholder(creds.publicBucket));
}

export function isPrivateStorageConfigured(env: Env = getEnv()): boolean {
  const creds = resolveStorageCredentials(env);
  return Boolean(creds?.privateBucket && !isPlaceholder(creds.privateBucket));
}

export function isStorageConfigured(env: Env = getEnv()): boolean {
  return isPublicStorageConfigured(env) && isPrivateStorageConfigured(env);
}
