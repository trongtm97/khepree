import { integrationStatus, isStorageConfigured } from "@khepree/config";
import type { IntegrationStatus } from "@khepree/types";
import { MockObjectStorage } from "./mock-storage";
import { S3ObjectStorage } from "./s3-storage";
import type { ObjectStorage } from "./types";

let storageInstance: ObjectStorage | null = null;

export function getObjectStorage(): ObjectStorage {
  if (!storageInstance) {
    storageInstance = isStorageConfigured() ? new S3ObjectStorage() : new MockObjectStorage();
  }
  return storageInstance;
}

/** Reset singleton — tests only. */
export function resetObjectStorageForTests(): void {
  storageInstance = null;
}

export function getStorageStatus(): IntegrationStatus {
  return integrationStatus(isStorageConfigured());
}

export function getPublicStorage(): ObjectStorage {
  return getObjectStorage();
}

export function getPrivateStorage(): ObjectStorage {
  return getObjectStorage();
}
