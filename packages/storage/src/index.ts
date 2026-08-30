export type {
  HeadObjectResult,
  ObjectStorage,
  PresignDownloadInput,
  PresignUploadInput,
  PresignedDownload,
  PresignedUpload,
  PutObjectInput,
  StorageBucket,
} from "./types";

export {
  createObjectKey,
  objectKeyIncludesOwner,
  objectKeyOwnerSegment,
  sanitizeClientFilename,
} from "./keys";
export { extensionForMime, validateUpload, UploadValidationError, UPLOAD_SIZE_LIMITS, sniffMagicMime, type UploadContentClass } from "./validation";
export { MockObjectStorage } from "./mock-storage";
export { S3ObjectStorage } from "./s3-storage";
export {
  StorageConfigurationError,
  StorageInfrastructureError,
  isObjectNotFoundError,
} from "./errors";
export {
  getObjectStorage,
  getPublicObjectStorage,
  getPrivateObjectStorage,
  getPublicStorage,
  getPrivateStorage,
  getStorageStatus,
  resetObjectStorageForTests,
} from "./factory";

/** @deprecated Use getObjectStorage() — legacy alias kept for Phase 0 callers. */
export { getObjectStorage as getStorage } from "./factory";
