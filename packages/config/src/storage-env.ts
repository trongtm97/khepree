import type { Env } from "./env";
import { getEnv } from "./env";

export interface ResolvedStorageCredentials {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket?: string;
  privateBucket?: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
}

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes("CHANGE_ME");
}

export function isS3StorageConfigured(env: Env = getEnv()): boolean {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY &&
      env.S3_REGION &&
      !isPlaceholder(env.S3_ENDPOINT) &&
      !isPlaceholder(env.S3_ACCESS_KEY_ID) &&
      !isPlaceholder(env.S3_SECRET_ACCESS_KEY) &&
      !isPlaceholder(env.S3_REGION),
  );
}

export function resolveStorageCredentials(env: Env = getEnv()): ResolvedStorageCredentials | null {
  if (!isS3StorageConfigured(env)) return null;

  return {
    endpoint: env.S3_ENDPOINT!,
    region: env.S3_REGION!.trim(),
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    publicBucket: env.S3_BUCKET_PUBLIC,
    privateBucket: env.S3_BUCKET_PRIVATE,
    publicBaseUrl: env.S3_PUBLIC_BASE_URL,
    // Vietnix/MinIO-style endpoints need path-style URLs (ChapMee default: not "false").
    forcePathStyle: env.S3_FORCE_PATH_STYLE !== "false",
  };
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

/** CDN/browser origin for public object keys — never the S3 API endpoint. */
export function resolvePublicMediaBaseUrl(env: Env = getEnv()): string | undefined {
  const creds = resolveStorageCredentials(env);
  const base = creds?.publicBaseUrl?.trim();
  if (!base || isPlaceholder(base)) return undefined;
  return base;
}

export type S3PublicAccessMode = "acl" | "none";

export function resolvePublicAccessMode(env: Env = getEnv()): S3PublicAccessMode {
  const mode = env.S3_PUBLIC_ACCESS_MODE ?? "acl";
  return mode === "none" ? "none" : "acl";
}
