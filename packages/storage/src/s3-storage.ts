import { resolveStorageCredentials } from "@khepree/config";
import { buildPublicObjectUrl } from "./public-url";
import {
  isPublicAclUnsupported,
  publicAclPutFields,
  publicAclUploadHeaders,
  PUBLIC_ACL_UNSUPPORTED_MESSAGE,
  resolvePublicAccessMode,
} from "./s3-access";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IntegrationStatus } from "@khepree/types";
import { assertSafeObjectKey } from "./object-key";
import { isObjectNotFoundError, StorageConfigurationError, StorageInfrastructureError } from "./errors";
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

const DEFAULT_UPLOAD_TTL = 900;
const DEFAULT_DOWNLOAD_TTL = 300;

/** S3-compatible adapter scoped to one logical bucket — no public/private fallback. */
export class S3ObjectStorage implements ObjectStorage {
  readonly provider = "s3";
  readonly status: IntegrationStatus = "configured";

  private client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly forcePathStyle: boolean;
  readonly bucketKind: StorageBucket;
  private readonly publicBaseUrl?: string;
  private readonly publicAccessMode = resolvePublicAccessMode();

  constructor(bucketKind: StorageBucket) {
    const creds = resolveStorageCredentials();
    if (!creds) {
      throw new StorageConfigurationError("S3 storage credentials are incomplete");
    }

    this.bucketKind = bucketKind;
    this.publicBaseUrl = creds.publicBaseUrl;
    this.endpoint = creds.endpoint.replace(/\/$/, "");
    this.forcePathStyle = creds.forcePathStyle;

    if (bucketKind === "private") {
      if (!creds.privateBucket) {
        throw new StorageConfigurationError("Private bucket is required for private storage");
      }
      this.bucketName = creds.privateBucket;
    } else {
      if (!creds.publicBucket) {
        throw new StorageConfigurationError("Public bucket is required for public storage");
      }
      this.bucketName = creds.publicBucket;
    }

    this.client = new S3Client({
      region: creds.region,
      endpoint: creds.endpoint,
      forcePathStyle: creds.forcePathStyle,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });
  }

  private assertBucket(requested: StorageBucket): void {
    if (requested !== this.bucketKind) {
      throw new StorageConfigurationError(
        `Storage instance for ${this.bucketKind} bucket cannot serve ${requested} requests`,
      );
    }
  }

  private objectApiUrl(key: string): string {
    const encoded = key
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    if (this.forcePathStyle) {
      return `${this.endpoint}/${this.bucketName}/${encoded}`;
    }
    return `${this.endpoint}/${encoded}`;
  }

  async putObject(input: PutObjectInput): Promise<{ key: string; etag?: string }> {
    this.assertBucket(input.bucket);
    assertSafeObjectKey(input.key);
    const aclFields =
      input.bucket === "public" ? publicAclPutFields(this.publicAccessMode) : {};

    try {
      const res = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          ...aclFields,
        }),
      );
      return { key: input.key, etag: res.ETag };
    } catch (error) {
      if (input.bucket === "public" && isPublicAclUnsupported(error)) {
        throw new StorageConfigurationError(PUBLIC_ACL_UNSUPPORTED_MESSAGE, { cause: error });
      }
      throw new StorageInfrastructureError("Failed to put object", error);
    }
  }

  async getObject(key: string, bucket: StorageBucket): Promise<Buffer | null> {
    this.assertBucket(bucket);
    assertSafeObjectKey(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch (error) {
      if (isObjectNotFoundError(error)) return null;
      throw new StorageInfrastructureError("Failed to get object", error);
    }
  }

  async deleteObject(key: string, bucket: StorageBucket): Promise<void> {
    this.assertBucket(bucket);
    assertSafeObjectKey(key);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
    } catch (error) {
      throw new StorageInfrastructureError("Failed to delete object", error);
    }
  }

  async headObject(key: string, bucket: StorageBucket): Promise<HeadObjectResult | null> {
    this.assertBucket(bucket);
    assertSafeObjectKey(key);
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return {
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        etag: res.ETag,
      };
    } catch (error) {
      if (isObjectNotFoundError(error)) return null;
      throw new StorageInfrastructureError("Failed to head object", error);
    }
  }

  async createPresignedUpload(input: PresignUploadInput): Promise<PresignedUpload> {
    this.assertBucket(input.bucket);
    assertSafeObjectKey(input.key);
    const expiresIn = input.expiresInSeconds ?? DEFAULT_UPLOAD_TTL;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const aclFields =
      input.bucket === "public" ? publicAclPutFields(this.publicAccessMode) : {};

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        ContentType: input.contentType,
        ...(typeof input.contentLength === "number" ? { ContentLength: input.contentLength } : {}),
        ...aclFields,
      });
      const url = await getSignedUrl(this.client, command, { expiresIn });
      const headers: Record<string, string> = {
        "Content-Type": input.contentType,
        ...(input.bucket === "public" ? publicAclUploadHeaders(this.publicAccessMode) : {}),
      };
      if (typeof input.contentLength === "number") {
        headers["Content-Length"] = String(input.contentLength);
      }
      return {
        url,
        key: input.key,
        bucket: input.bucket,
        expiresAt,
        headers,
      };
    } catch (error) {
      if (input.bucket === "public" && isPublicAclUnsupported(error)) {
        throw new StorageConfigurationError(PUBLIC_ACL_UNSUPPORTED_MESSAGE, { cause: error });
      }
      throw new StorageInfrastructureError("Failed to create presigned upload", error);
    }
  }

  async createPresignedDownload(input: PresignDownloadInput): Promise<PresignedDownload> {
    this.assertBucket(input.bucket);
    assertSafeObjectKey(input.key);
    const expiresIn = input.expiresInSeconds ?? DEFAULT_DOWNLOAD_TTL;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
      });
      const url = await getSignedUrl(this.client, command, { expiresIn });
      return {
        url,
        key: input.key,
        bucket: input.bucket,
        expiresAt,
      };
    } catch (error) {
      throw new StorageInfrastructureError("Failed to create presigned download", error);
    }
  }

  publicUrl(key: string): string | null {
    if (this.bucketKind !== "public") return null;
    if (!this.publicBaseUrl) return null;
    assertSafeObjectKey(key);
    return buildPublicObjectUrl(this.publicBaseUrl, key);
  }

  async verifyPublicReadAccess(key: string): Promise<void> {
    if (this.bucketKind !== "public") return;
    if (this.publicAccessMode !== "acl") return;

    const response = await fetch(this.objectApiUrl(key), { method: "HEAD" });
    if (!response.ok) {
      throw new StorageConfigurationError(
        `Public object is not anonymously readable (HTTP ${response.status}). ${PUBLIC_ACL_UNSUPPORTED_MESSAGE}`,
      );
    }
  }

  async verifyPrivateNotPubliclyReadable(key: string): Promise<void> {
    if (this.bucketKind !== "private") return;

    const response = await fetch(this.objectApiUrl(key), { method: "HEAD" });
    if (response.ok) {
      throw new StorageConfigurationError("Private object is publicly readable without authentication");
    }
  }
}
