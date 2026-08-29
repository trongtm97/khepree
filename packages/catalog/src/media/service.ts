import { eq } from "drizzle-orm";
import {
  createPublicId,
  mediaAssets,
  requireDb,
  type Database,
} from "@khepree/db";
import {
  createObjectKey,
  extensionForMime,
  getObjectStorage,
  validateUpload,
  type ObjectStorage,
} from "@khepree/storage";
import type {
  CompleteMediaUploadInput,
  MediaRecord,
  MediaVisibility,
  PrepareMediaUploadInput,
  PrepareMediaUploadResult,
} from "../content/types";

function mapMedia(
  row: typeof mediaAssets.$inferSelect,
  storage: ObjectStorage,
): MediaRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    storageProvider: row.storageProvider,
    bucket: row.bucket,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksumSha256: row.checksumSha256,
    width: row.width,
    height: row.height,
    visibility: row.visibility,
    altText: row.altText,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
    context: row.context,
    publicUrl: row.visibility === "public" ? storage.publicUrl(row.objectKey) : null,
    createdAt: row.createdAt,
  };
}

export class MediaService {
  constructor(
    private db: Database = requireDb(),
    private storage: ObjectStorage = getObjectStorage(),
  ) {}

  async prepareUpload(input: PrepareMediaUploadInput): Promise<PrepareMediaUploadResult> {
    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      bucket: input.visibility,
    });

    const extension = extensionForMime(input.mimeType);
    const objectKey = createObjectKey({
      namespace: input.namespace,
      extension,
      visibility: input.visibility,
    });

    const presigned = await this.storage.createPresignedUpload({
      key: objectKey,
      contentType: input.mimeType,
      bucket: input.visibility,
    });

    return {
      objectKey,
      bucket: input.visibility,
      upload: {
        url: presigned.url,
        expiresAt: presigned.expiresAt,
        headers: presigned.headers,
      },
    };
  }

  async completeUpload(input: CompleteMediaUploadInput): Promise<MediaRecord> {
    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.expectedSizeBytes,
      bucket: input.bucket,
    });

    const head = await this.storage.headObject(input.objectKey, input.bucket);
    if (!head?.contentLength) {
      throw new Error("Uploaded object not found in storage");
    }

    if (head.contentLength !== input.expectedSizeBytes) {
      throw new Error("Uploaded object size does not match declared size");
    }

    if (head.contentType && head.contentType !== input.mimeType) {
      throw new Error("Uploaded object MIME type does not match declared type");
    }

    const [row] = await this.db
      .insert(mediaAssets)
      .values({
        publicId: createPublicId("med"),
        storageProvider: this.storage.provider === "r2" ? "r2" : "mock",
        bucket: input.bucket,
        objectKey: input.objectKey,
        mimeType: input.mimeType,
        sizeBytes: head.contentLength,
        checksumSha256: input.checksumSha256 ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        visibility: input.bucket,
        altText: input.altText ?? null,
        ownerType: input.ownerType ?? null,
        ownerId: input.ownerId ?? null,
        context: input.context ?? null,
      })
      .returning();

    if (!row) throw new Error("Failed to register media asset");
    return mapMedia(row, this.storage);
  }

  async getByPublicId(publicId: string): Promise<MediaRecord | null> {
    const [row] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.publicId, publicId))
      .limit(1);

    return row ? mapMedia(row, this.storage) : null;
  }

  async createPrivateDownloadUrl(publicId: string): Promise<{ url: string; expiresAt: Date }> {
    const media = await this.getByPublicId(publicId);
    if (!media) throw new Error("Media not found");
    if (media.visibility !== "private") {
      throw new Error("Public media does not require a signed download URL");
    }

    const presigned = await this.storage.createPresignedDownload({
      key: media.objectKey,
      bucket: "private",
    });

    return { url: presigned.url, expiresAt: presigned.expiresAt };
  }
}

export function createMediaService(db?: Database, storage?: ObjectStorage): MediaService {
  return new MediaService(db, storage);
}

export type { MediaVisibility };
