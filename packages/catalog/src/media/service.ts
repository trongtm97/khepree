import { count, eq } from "drizzle-orm";
import {
  createPublicId,
  mediaAssets,
  products,
  requireDb,
  softwareReleases,
  type Database,
} from "@khepree/db";
import {
  createObjectKey,
  extensionForMime,
  getPrivateObjectStorage,
  getPublicObjectStorage,
  isAbsoluteHttpUrl,
  objectKeyIncludesOwner,
  storageProviderForDb,
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
      contentClass: input.contentClass,
    });

    const storage = this.storageFor(input.visibility);
    const extension = extensionForMime(input.mimeType);
    const objectKey = createObjectKey({
      namespace: input.namespace,
      pathPrefix: input.pathPrefix,
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
    if (isAbsoluteHttpUrl(input.objectKey)) {
      throw new Error("objectKey must be a canonical storage key, not a full URL");
    }

    const contentClass =
      input.contentClass ??
      (input.bucket === "private" && input.context?.startsWith("release")
        ? "software_release"
        : undefined);

    if (
      input.bucket === "public" &&
      input.mimeType.startsWith("image/") &&
      input.mimeType !== "image/svg+xml" &&
      !input.altText?.trim()
    ) {
      throw new Error("Alt text is required for public images");
    }

    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.expectedSizeBytes,
      bucket: input.bucket,
      contentClass,
      requireChecksum:
        input.bucket === "private" &&
        Boolean(input.checksumSha256 || input.context?.startsWith("release")),
      checksumSha256: input.checksumSha256,
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

    if (input.bucket === "public" && storage.verifyPublicReadAccess) {
      await storage.verifyPublicReadAccess(input.objectKey);
    }

    const [row] = await this.db
      .insert(mediaAssets)
      .values({
        publicId: createPublicId("med"),
        storageProvider: storageProviderForDb(storage.provider),
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

  /** Server-side put after raster processing (product studio, CMS pipeline). */
  async uploadProcessedPublicRaster(input: {
    body: Buffer;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    altText: string;
    context?: string | null;
    ownerType?: string | null;
    ownerId?: string | null;
    namespace?: string;
    pathPrefix?: string;
  }): Promise<MediaRecord> {
    const prepared = await this.prepareUpload({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: "public",
      namespace: input.namespace ?? "media",
      pathPrefix: input.pathPrefix ?? "media",
      context: input.context ?? null,
      ownerType: input.ownerType ?? null,
      ownerId: input.ownerId ?? null,
      contentClass: "marketing_raster",
    });

    await this.publicStorage.putObject({
      key: prepared.objectKey,
      bucket: "public",
      body: input.body,
      contentType: input.mimeType,
    });

    return this.completeUpload({
      objectKey: prepared.objectKey,
      bucket: "public",
      mimeType: input.mimeType,
      expectedSizeBytes: input.sizeBytes,
      altText: input.altText,
      context: input.context ?? null,
      ownerType: input.ownerType ?? null,
      ownerId: input.ownerId ?? null,
      width: input.width,
      height: input.height,
    });
  }

  async getByPublicId(publicId: string): Promise<MediaRecord | null> {
    const [row] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.publicId, publicId))
      .limit(1);

    return row ? mapMedia(row, this.publicStorage) : null;
  }

  /** Short-lived S3 GET for admin preview when CDN is not readable. */
  async createPublicPresignedPreviewUrl(
    publicId: string,
    expiresInSeconds = 900,
  ): Promise<string | null> {
    const media = await this.getByPublicId(publicId);
    if (!media || media.bucket !== "public") return null;
    const presigned = await this.publicStorage.createPresignedDownload({
      key: media.objectKey,
      bucket: "public",
      expiresInSeconds,
    });
    return presigned.url;
  }

  async updateAltText(publicId: string, altText: string | null): Promise<MediaRecord> {
    const [row] = await this.db
      .update(mediaAssets)
      .set({ altText: altText?.trim() || null, updatedAt: new Date() })
      .where(eq(mediaAssets.publicId, publicId))
      .returning();
    if (!row) throw new Error("Media not found");
    return mapMedia(row, this.publicStorage);
  }

  async getReferenceCounts(mediaId: string): Promise<{ productIcons: number; releases: number }> {
    const [[iconRow], [releaseRow]] = await Promise.all([
      this.db.select({ n: count() }).from(products).where(eq(products.iconMediaId, mediaId)),
      this.db
        .select({ n: count() })
        .from(softwareReleases)
        .where(eq(softwareReleases.mediaAssetId, mediaId)),
    ]);
    return {
      productIcons: Number(iconRow?.n ?? 0),
      releases: Number(releaseRow?.n ?? 0),
    };
  }

  async deleteIfUnreferenced(publicId: string): Promise<void> {
    const [row] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.publicId, publicId))
      .limit(1);
    if (!row) throw new Error("Media not found");
    const refs = await this.getReferenceCounts(row.id);
    if (refs.productIcons + refs.releases > 0) {
      throw new Error("Media is referenced and cannot be deleted");
    }
    await this.db.delete(mediaAssets).where(eq(mediaAssets.id, row.id));
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
