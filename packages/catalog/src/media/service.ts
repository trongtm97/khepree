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
  getPrivateObjectStorage,
  getPublicObjectStorage,
  objectKeyIncludesOwner,
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
  publicStorage: ObjectStorage,
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
    publicUrl: row.visibility === "public" ? publicStorage.publicUrl(row.objectKey) : null,
    createdAt: row.createdAt,
  };
}

export class MediaService {
  constructor(
    private db: Database = requireDb(),
    private publicStorage: ObjectStorage = getPublicObjectStorage(),
    private privateStorage: ObjectStorage = getPrivateObjectStorage(),
  ) {}

  private storageFor(bucket: MediaVisibility): ObjectStorage {
    return bucket === "public" ? this.publicStorage : this.privateStorage;
  }

  async prepareUpload(input: PrepareMediaUploadInput): Promise<PrepareMediaUploadResult> {
    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      bucket: input.visibility,
    });

    const storage = this.storageFor(input.visibility);
    const extension = extensionForMime(input.mimeType);
    const objectKey = createObjectKey({
      namespace: input.namespace,
      extension,
      visibility: input.visibility,
      ownerId: input.ownerId ?? undefined,
    });

    const presigned = await storage.createPresignedUpload({
      key: objectKey,
      contentType: input.mimeType,
      bucket: input.visibility,
      contentLength: input.sizeBytes,
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

    const storage = this.storageFor(input.bucket);
    const head = await storage.headObject(input.objectKey, input.bucket);
    if (!head?.contentLength) {
      throw new Error("Uploaded object not found in storage");
    }

    if (head.contentLength !== input.expectedSizeBytes) {
      throw new Error("Uploaded object size does not match declared size");
    }

    if (head.contentType && head.contentType !== input.mimeType) {
      throw new Error("Uploaded object MIME type does not match declared type");
    }

    if (input.ownerId && !objectKeyIncludesOwner(input.objectKey, input.ownerId)) {
      throw new Error("Uploaded object does not belong to this owner");
    }

    const [row] = await this.db
      .insert(mediaAssets)
      .values({
        publicId: createPublicId("med"),
        storageProvider: storage.provider === "r2" ? "r2" : "mock",
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
    return mapMedia(row, this.publicStorage);
  }

  async getByPublicId(publicId: string): Promise<MediaRecord | null> {
    const [row] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.publicId, publicId))
      .limit(1);

    return row ? mapMedia(row, this.publicStorage) : null;
  }
}

export function createMediaService(
  db?: Database,
  publicStorage?: ObjectStorage,
  privateStorage?: ObjectStorage,
): MediaService {
  return new MediaService(
    db,
    publicStorage ?? getPublicObjectStorage(),
    privateStorage ?? getPrivateObjectStorage(),
  );
}

export type { MediaVisibility };
