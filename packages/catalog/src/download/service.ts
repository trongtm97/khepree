import { eq } from "drizzle-orm";
import { mediaAssets, requireDb, type Database } from "@khepree/db";
import { getPrivateObjectStorage, type ObjectStorage } from "@khepree/storage";
import type { MediaRecord } from "../content/types";

export interface DownloadAuthorizationContext {
  actorUserId?: string;
  actorOrgId?: string;
  purpose: string;
  /** Set only after the caller has already passed a server permission check. */
  adminAuthorized?: boolean;
  /** Required when media.context is `product:<id>` — caller must have checked entitlement. */
  entitled?: boolean;
}

export function productIdFromMediaContext(context: string | null | undefined): string | null {
  if (!context) return null;
  const match = /^product:([a-zA-Z0-9_-]{1,80})$/.exec(context);
  return match?.[1] ?? null;
}

export interface DownloadAccessPolicy {
  canDownloadPrivateMedia(
    media: MediaRecord,
    context: DownloadAuthorizationContext,
  ): boolean;
}

function isDevLike(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

function mapMediaRow(row: typeof mediaAssets.$inferSelect): MediaRecord {
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
    publicUrl: null,
    createdAt: row.createdAt,
  };
}

/** Deny by default. Product-bound private files require entitlement, not ownership. */
export const defaultDownloadAccessPolicy: DownloadAccessPolicy = {
  canDownloadPrivateMedia(media, context) {
    if (media.visibility !== "private") return false;
    if (context.adminAuthorized && context.actorUserId) return true;

    if (productIdFromMediaContext(media.context)) {
      return context.entitled === true;
    }

    if (media.ownerType === "user" && media.ownerId && context.actorUserId === media.ownerId) {
      return true;
    }
    if (
      media.ownerType === "organization" &&
      media.ownerId &&
      context.actorOrgId === media.ownerId
    ) {
      return true;
    }

    if (!media.ownerType && !media.ownerId && isDevLike()) {
      return true;
    }

    return false;
  },
};

export class DownloadService {
  constructor(
    private db: Database = requireDb(),
    private privateStorage: ObjectStorage = getPrivateObjectStorage(),
    private policy: DownloadAccessPolicy = defaultDownloadAccessPolicy,
  ) {}

  async authorizePrivateDownload(input: {
    mediaPublicId: string;
    context: DownloadAuthorizationContext;
  }): Promise<{ url: string; expiresAt: Date }> {
    const [row] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.publicId, input.mediaPublicId))
      .limit(1);

    if (!row) throw new Error("Media not found");

    const media = mapMediaRow(row);
    if (media.visibility !== "private") {
      throw new Error("Public media does not require a signed download URL");
    }

    if (!this.policy.canDownloadPrivateMedia(media, input.context)) {
      throw new Error("Download not authorized");
    }

    const presigned = await this.privateStorage.createPresignedDownload({
      key: media.objectKey,
      bucket: "private",
    });

    return { url: presigned.url, expiresAt: presigned.expiresAt };
  }
}

export function createDownloadService(
  db?: Database,
  privateStorage?: ObjectStorage,
  policy?: DownloadAccessPolicy,
): DownloadService {
  return new DownloadService(db, privateStorage, policy);
}
