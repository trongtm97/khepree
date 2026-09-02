import { and, desc, eq } from "drizzle-orm";
import type { ReleaseArchitecture, ReleaseChannel } from "@khepree/db";
import { mediaAssets, releaseArtifacts, requireDb, softwareReleases, type Database } from "@khepree/db";
import type { ObjectStorage } from "@khepree/storage";
import { getPrivateObjectStorage } from "@khepree/storage";
import { CatalogError } from "../product/admin";
import type { ReleaseRecord } from "./types";
import {
  buildSquirrelReleasesFile,
  filterSquirrelEntriesToKnownArtifacts,
  parseSquirrelReleasesFile,
  rewriteSquirrelReleaseEntryUrl,
  sanitizeSquirrelNupkgFilename,
  type SquirrelReleaseEntry,
} from "./squirrel-releases";
import { pickLatestPublishedRelease } from "./version";
import type { ReleaseService } from "./service";

export interface SquirrelFeedBuildInput {
  productId: string;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  buildArtifactUrl: (input: {
    releasePublicId: string;
    artifactPublicId: string;
    fileName: string;
  }) => string;
}

export interface SquirrelFeedBuildResult {
  body: string;
  release: ReleaseRecord | null;
  hadPublishedRelease: boolean;
}

export class SquirrelFeedService {
  constructor(
    private readonly db: Database = requireDb(),
    private readonly storage: ObjectStorage = getPrivateObjectStorage(),
  ) {}

  async buildFeed(
    releaseService: ReleaseService,
    input: SquirrelFeedBuildInput,
  ): Promise<SquirrelFeedBuildResult> {
    const rows = await this.db
      .select()
      .from(softwareReleases)
      .where(
        and(
          eq(softwareReleases.productId, input.productId),
          eq(softwareReleases.platform, "windows"),
          eq(softwareReleases.status, "published"),
          eq(softwareReleases.channel, input.channel),
        ),
      )
      .orderBy(desc(softwareReleases.publishedAt));

    const picked = pickLatestPublishedRelease(rows, {
      platform: "windows",
      architecture: input.architecture,
      channel: input.channel,
    });

    if (!picked) {
      return { body: "", release: null, hadPublishedRelease: false };
    }

    const release = await releaseService.getByPublicId(picked.publicId);
    if (!release || release.status !== "published") {
      return { body: "", release: null, hadPublishedRelease: false };
    }

    const indexArtifact = release.artifacts.find((artifact) => artifact.kind === "releases-index");
    if (!indexArtifact) {
      throw new CatalogError("INVALID_INPUT", "Published release is missing RELEASES index artifact");
    }

    const indexBytes = await this.readArtifactBytes(indexArtifact.mediaAssetId);
    const parsed = parseSquirrelReleasesFile(indexBytes.toString("utf8"));
    const filtered = filterSquirrelEntriesToKnownArtifacts(parsed, release.artifacts);
    const rewritten = filtered.map((entry) =>
      rewriteEntryWithTicketUrl(entry, release, input.buildArtifactUrl),
    );

    return {
      body: buildSquirrelReleasesFile(rewritten),
      release,
      hadPublishedRelease: true,
    };
  }

  async readArtifactBytes(mediaAssetId: string): Promise<Buffer> {
    const [media] = await this.db
      .select({ objectKey: mediaAssets.objectKey })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, mediaAssetId))
      .limit(1);
    if (!media) throw new CatalogError("NOT_FOUND", "Artifact media not found");

    const bytes = await this.storage.getObject(media.objectKey, "private");
    if (!bytes) throw new CatalogError("NOT_FOUND", "Artifact bytes not found in storage");
    return bytes;
  }

  async resolveArtifactForDownload(input: {
    releasePublicId: string;
    artifactPublicId: string;
    fileName: string;
  }): Promise<{
    release: typeof softwareReleases.$inferSelect;
    artifact: typeof releaseArtifacts.$inferSelect;
    mediaObjectKey: string;
  }> {
    const safeName = sanitizeSquirrelNupkgFilename(input.fileName);
    if (!safeName) {
      throw new CatalogError("INVALID_INPUT", "Unsafe artifact filename");
    }

    const [release] = await this.db
      .select()
      .from(softwareReleases)
      .where(
        and(
          eq(softwareReleases.publicId, input.releasePublicId),
          eq(softwareReleases.status, "published"),
        ),
      )
      .limit(1);
    if (!release) throw new CatalogError("NOT_FOUND", "Release not found");

    const [artifact] = await this.db
      .select()
      .from(releaseArtifacts)
      .where(
        and(
          eq(releaseArtifacts.publicId, input.artifactPublicId),
          eq(releaseArtifacts.releaseId, release.id),
        ),
      )
      .limit(1);
    if (!artifact || artifact.fileName !== safeName) {
      throw new CatalogError("NOT_FOUND", "Artifact not found");
    }
    if (artifact.kind !== "full-nupkg" && artifact.kind !== "delta-nupkg") {
      throw new CatalogError("INVALID_INPUT", "Artifact is not a nupkg package");
    }

    const [media] = await this.db
      .select({ objectKey: mediaAssets.objectKey })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, artifact.mediaAssetId))
      .limit(1);
    if (!media) throw new CatalogError("NOT_FOUND", "Artifact media not found");

    return { release, artifact, mediaObjectKey: media.objectKey };
  }
}

function rewriteEntryWithTicketUrl(
  entry: SquirrelReleaseEntry,
  release: ReleaseRecord,
  buildArtifactUrl: SquirrelFeedBuildInput["buildArtifactUrl"],
): SquirrelReleaseEntry {
  const safeName = sanitizeSquirrelNupkgFilename(entry.filename);
  if (!safeName) {
    throw new CatalogError("INVALID_INPUT", "Unsafe nupkg filename in RELEASES index");
  }

  const artifact = release.artifacts.find(
    (row) =>
      row.fileName === safeName &&
      row.sizeBytes === entry.sizeBytes &&
      (row.kind === "full-nupkg" || row.kind === "delta-nupkg"),
  );
  if (!artifact) {
    throw new CatalogError("INVALID_INPUT", "RELEASES entry does not match published artifacts");
  }

  return rewriteSquirrelReleaseEntryUrl(
    entry,
    buildArtifactUrl({
      releasePublicId: release.publicId,
      artifactPublicId: artifact.publicId,
      fileName: safeName,
    }),
  );
}

export function createSquirrelFeedService(db?: Database, storage?: ObjectStorage): SquirrelFeedService {
  return new SquirrelFeedService(db, storage);
}
