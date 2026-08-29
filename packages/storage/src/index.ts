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

export { createObjectKey, sanitizeClientFilename } from "./keys";
export { extensionForMime, validateUpload, UploadValidationError, UPLOAD_SIZE_LIMITS } from "./validation";
export { MockObjectStorage } from "./mock-storage";
export { S3ObjectStorage } from "./s3-storage";
export {
  getObjectStorage,
  getPublicStorage,
  getPrivateStorage,
  getStorageStatus,
  resetObjectStorageForTests,
} from "./factory";

/** @deprecated Use getObjectStorage() — legacy alias kept for Phase 0 callers. */
export { getObjectStorage as getStorage } from "./factory";
