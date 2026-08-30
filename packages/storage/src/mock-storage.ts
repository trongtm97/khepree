import type { IntegrationStatus } from "@khepree/types";
import { resolvePublicAccessMode } from "./s3-access";
import { StorageConfigurationError } from "./errors";
import type {
  HeadObjectResult,
  ObjectStorage,
  PresignDownloadInput,
  PresignUploadInput,
  PresignedDownload,
  PresignedUpload,
  PutObjectInput,
  StorageBucket,
} from "./types";

interface StoredObject {
  body: Buffer;
  contentType: string;
  bucket: StorageBucket;
  publicRead?: boolean;
}

/** In-memory storage for development — never claims production delivery. */
export class MockObjectStorage implements ObjectStorage {
  readonly provider = "mock";
  readonly status: IntegrationStatus = "mock";
  private store = new Map<string, StoredObject>();
  private readonly publicAccessMode = resolvePublicAccessMode();

  private storeKey(key: string, bucket: StorageBucket) {
    return `${bucket}:${key}`;
  }

  async putObject(input: PutObjectInput): Promise<{ key: string; etag?: string }> {
    const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
    this.store.set(this.storeKey(input.key, input.bucket), {
      body,
      contentType: input.contentType,
      bucket: input.bucket,
      publicRead: input.bucket === "public" && this.publicAccessMode === "acl",
    });
    return { key: input.key, etag: `"mock-${body.length}"` };
  }

  async getObject(key: string, bucket: StorageBucket): Promise<Buffer | null> {
    return this.store.get(this.storeKey(key, bucket))?.body ?? null;
  }

  async deleteObject(key: string, bucket: StorageBucket): Promise<void> {
    this.store.delete(this.storeKey(key, bucket));
  }

  async headObject(key: string, bucket: StorageBucket): Promise<HeadObjectResult | null> {
    const obj = this.store.get(this.storeKey(key, bucket));
    if (!obj) return null;
    return {
      contentType: obj.contentType,
      contentLength: obj.body.length,
      etag: `"mock-${obj.body.length}"`,
    };
  }

  async createPresignedUpload(input: PresignUploadInput): Promise<PresignedUpload> {
    const expiresIn = input.expiresInSeconds ?? 900;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return {
      url: `mock://upload/${input.bucket}/${input.key}?expires=${expiresAt.getTime()}`,
      key: input.key,
      bucket: input.bucket,
      expiresAt,
      headers: {
        "Content-Type": input.contentType,
        ...(input.bucket === "public" && this.publicAccessMode === "acl"
          ? { "x-amz-acl": "public-read" }
          : {}),
        ...(typeof input.contentLength === "number"
          ? { "Content-Length": String(input.contentLength) }
          : {}),
      },
    };
  }

  async createPresignedDownload(input: PresignDownloadInput): Promise<PresignedDownload> {
    const expiresIn = input.expiresInSeconds ?? 300;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return {
      url: `mock://download/${input.bucket}/${input.key}?expires=${expiresAt.getTime()}`,
      key: input.key,
      bucket: input.bucket,
      expiresAt,
    };
  }

  publicUrl(key: string): string | null {
    return `/mock-storage/${key}`;
  }

  async verifyPublicReadAccess(key: string): Promise<void> {
    const obj = this.store.get(this.storeKey(key, "public"));
    if (!obj) {
      throw new StorageConfigurationError("Public object not found for read verification");
    }
    if (this.publicAccessMode === "acl" && !obj.publicRead) {
      throw new StorageConfigurationError("Public object is not marked public-read");
    }
  }

  async verifyPrivateNotPubliclyReadable(_key: string): Promise<void> {
    /* mock private objects are never anonymously readable */
  }
}
