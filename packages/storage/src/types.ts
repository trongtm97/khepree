import type { IntegrationStatus } from "@khepree/types";

/** Logical bucket — maps to configured S3 public or private bucket names. */
export type StorageBucket = "public" | "private";

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  bucket: StorageBucket;
}

export interface HeadObjectResult {
  contentType?: string;
  contentLength?: number;
  etag?: string;
}

export interface PresignedUpload {
  url: string;
  key: string;
  bucket: StorageBucket;
  expiresAt: Date;
  /** Extra headers the client must send with the PUT (e.g. Content-Type). */
  headers: Record<string, string>;
}

export interface PresignedDownload {
  url: string;
  key: string;
  bucket: StorageBucket;
  expiresAt: Date;
}

export interface PresignUploadInput {
  key: string;
  contentType: string;
  bucket: StorageBucket;
  /** Default 900s (15 min). */
  expiresInSeconds?: number;
  /** When set, the signed PUT is bound to this Content-Length. */
  contentLength?: number;
}

export interface PresignDownloadInput {
  key: string;
  bucket: StorageBucket;
  /** Default 300s (5 min) for private objects. */
  expiresInSeconds?: number;
}

/** S3-compatible object storage — apps depend on this, not R2 specifics. */
export interface ObjectStorage {
  readonly provider: string;
  readonly status: IntegrationStatus;
  putObject(input: PutObjectInput): Promise<{ key: string; etag?: string }>;
  getObject(key: string, bucket: StorageBucket): Promise<Buffer | null>;
  deleteObject(key: string, bucket: StorageBucket): Promise<void>;
  headObject(key: string, bucket: StorageBucket): Promise<HeadObjectResult | null>;
  createPresignedUpload(input: PresignUploadInput): Promise<PresignedUpload>;
  createPresignedDownload(input: PresignDownloadInput): Promise<PresignedDownload>;
  /** CDN URL for public bucket objects — null for private instances or when not configured. */
  publicUrl(key: string): string | null;
  /** Verify anonymous read via S3 API (completeUpload / diagnostics only). */
  verifyPublicReadAccess?(key: string): Promise<void>;
  /** Verify object is not anonymously readable (private isolation). */
  verifyPrivateNotPubliclyReadable?(key: string): Promise<void>;
}
