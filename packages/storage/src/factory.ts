import {
  isPrivateStorageConfigured,
  isPublicStorageConfigured,
  integrationStatus,
  validateRuntimeEnv,
} from "@khepree/config";
import type { IntegrationStatus } from "@khepree/types";
import { StorageConfigurationError } from "./errors";
import { MockObjectStorage } from "./mock-storage";
import { S3ObjectStorage } from "./s3-storage";
import type { ObjectStorage, StorageBucket } from "./types";

let publicInstance: ObjectStorage | null = null;
let privateInstance: ObjectStorage | null = null;

function isDevLike(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

function createForBucket(bucket: StorageBucket): ObjectStorage {
  validateRuntimeEnv();

  if (bucket === "public") {
    if (isPublicStorageConfigured()) return new S3ObjectStorage("public");
    if (isDevLike()) return new MockObjectStorage();
    throw new StorageConfigurationError(
      "Public object storage is not configured. Set S3_BUCKET_PUBLIC and credentials.",
    );
  }

  if (isPrivateStorageConfigured()) return new S3ObjectStorage("private");
  if (isDevLike()) return new MockObjectStorage();
  throw new StorageConfigurationError(
    "Private object storage is not configured. Set S3_BUCKET_PRIVATE — never fall back to public.",
  );
}

export function getPublicObjectStorage(): ObjectStorage {
  if (!publicInstance) publicInstance = createForBucket("public");
  return publicInstance;
}

export function getPrivateObjectStorage(): ObjectStorage {
  if (!privateInstance) privateInstance = createForBucket("private");
  return privateInstance;
}

/** @deprecated Prefer getPublicObjectStorage / getPrivateObjectStorage explicitly. */
export function getObjectStorage(): ObjectStorage {
  return getPublicObjectStorage();
}

export function getPublicStorage(): ObjectStorage {
  return getPublicObjectStorage();
}

export function getPrivateStorage(): ObjectStorage {
  return getPrivateObjectStorage();
}

export function resetObjectStorageForTests(): void {
  publicInstance = null;
  privateInstance = null;
}

export function getStorageStatus(): IntegrationStatus {
  return integrationStatus(isPublicStorageConfigured() && isPrivateStorageConfigured());
}
