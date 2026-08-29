import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@khepree/config";
import type { IntegrationStatus } from "@khepree/types";
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

/** S3-compatible adapter — used with Cloudflare R2 in production. */
export class S3ObjectStorage implements ObjectStorage {
  readonly provider = "r2";
  readonly status: IntegrationStatus = "configured";

  private client: S3Client;
  private publicBucket: string;
  private privateBucket: string;
  private publicBaseUrl: string;

  constructor() {
    const env = getEnv();
    this.publicBucket = env.R2_BUCKET_PUBLIC!;
    this.privateBucket = env.R2_BUCKET_PRIVATE ?? env.R2_BUCKET_PUBLIC!;
    this.publicBaseUrl = env.R2_PUBLIC_BASE_URL ?? "";

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  private resolveBucketName(bucket: StorageBucket): string {
    return bucket === "private" ? this.privateBucket : this.publicBucket;
  }

  async putObject(input: PutObjectInput): Promise<{ key: string; etag?: string }> {
    const res = await this.client.send(
      new PutObjectCommand({
        Bucket: this.resolveBucketName(input.bucket),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { key: input.key, etag: res.ETag };
  }

  async getObject(key: string, bucket: StorageBucket): Promise<Buffer | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.resolveBucketName(bucket), Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }

  async deleteObject(key: string, bucket: StorageBucket): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.resolveBucketName(bucket), Key: key }),
    );
  }

  async headObject(key: string, bucket: StorageBucket): Promise<HeadObjectResult | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.resolveBucketName(bucket), Key: key }),
      );
      return {
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        etag: res.ETag,
      };
    } catch {
      return null;
    }
  }

  async createPresignedUpload(input: PresignUploadInput): Promise<PresignedUpload> {
    const expiresIn = input.expiresInSeconds ?? DEFAULT_UPLOAD_TTL;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const command = new PutObjectCommand({
      Bucket: this.resolveBucketName(input.bucket),
      Key: input.key,
      ContentType: input.contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      key: input.key,
      bucket: input.bucket,
      expiresAt,
      headers: { "Content-Type": input.contentType },
    };
  }

  async createPresignedDownload(input: PresignDownloadInput): Promise<PresignedDownload> {
    const expiresIn = input.expiresInSeconds ?? DEFAULT_DOWNLOAD_TTL;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const command = new GetObjectCommand({
      Bucket: this.resolveBucketName(input.bucket),
      Key: input.key,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      key: input.key,
      bucket: input.bucket,
      expiresAt,
    };
  }

  publicUrl(key: string): string | null {
    if (!this.publicBaseUrl) return null;
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
}
