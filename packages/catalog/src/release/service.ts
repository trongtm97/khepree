import { and, desc, eq, inArray } from "drizzle-orm";
import type { KeyObject } from "node:crypto";
import { loadUpdateSigningTrustStore } from "@khepree/config";
import {
  createPublicId,
  mediaAssets,
  productTranslations,
  products,
  releaseArtifacts,
  releaseTranslations,
  softwareReleases,
  type AuditService,
  type Database,
  type ReleasePlatform,
} from "@khepree/db";
import { getPrivateObjectStorage, validateUpload, type ObjectStorage } from "@khepree/storage";
import { CatalogError } from "../product/admin";
import { requireLocaleRow } from "../product/i18n";
import { MediaService } from "../media/service";
import {
  mediaContextMatchesRelease,
} from "./artifact-policy";
import { resolveReleaseNotes, sortPublicChangelog } from "./public-changelog";
import { assessReleasePublishReadiness } from "./publish-gate";
import type {
  AddReleaseArtifactInput,
  CreateReleaseDraftInput,
  LatestReleaseQuery,
  PrepareReleaseUploadInput,
  PublicChangelogEntry,
  ReleaseArtifactRecord,
  ReleasePublishReadiness,
  ReleaseRecord,
} from "./types";
import { buildUpdateArtifactManifest, verifyUpdateArtifactManifestSignature } from "./update-signing";
import { parseReleaseVersion, pickLatestCompatibleRelease } from "./version";

const PLATFORM_LABEL: Record<ReleasePlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

function mapArtifact(
  row: typeof releaseArtifacts.$inferSelect,
  mediaPublicId: string,
): ReleaseArtifactRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    releaseId: row.releaseId,
    kind: row.kind,
    mediaAssetId: row.mediaAssetId,
    mediaPublicId,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    signature: row.signature,
    signingKeyId: row.signingKeyId,
    createdAt: row.createdAt,
  };
}

function mapRelease(
  row: typeof softwareReleases.$inferSelect,
  mediaPublicId: string,
  notes: Array<{ locale: string; releaseNotes: string | null }>,
  artifacts: ReleaseArtifactRecord[],
): ReleaseRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    productId: row.productId,
    version: row.version,
    platform: row.platform,
    architecture: row.architecture,
    channel: row.channel,
    mediaAssetId: row.mediaAssetId,
    mediaPublicId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    checksumSha256: row.checksumSha256,
    signature: row.signature,
    artifacts,
    minimumSupportedVersion: row.minimumSupportedVersion,
    mandatoryUpdate: row.mandatoryUpdate,
    status: row.status,
    publishedAt: row.publishedAt,
    releaseNotesVi: notes.find((n) => n.locale === "vi")?.releaseNotes ?? null,
    releaseNotesEn: notes.find((n) => n.locale === "en")?.releaseNotes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ReleaseService {
  private mediaService?: MediaService;
  private privateStorageOverride?: ObjectStorage;
  private privateStorageInstance?: ObjectStorage;

  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    media?: MediaService,
    privateStorage?: ObjectStorage,
    private readonly trustedPublicKeys?: Map<string, KeyObject>,
  ) {
    this.mediaService = media;
    this.privateStorageOverride = privateStorage;
  }

  /** Lazy — public changelog/list paths must not require private object storage at construct time. */
  private get privateStorage(): ObjectStorage {
    return (this.privateStorageInstance ??=
      this.privateStorageOverride ?? getPrivateObjectStorage());
  }

  private getTrustedPublicKeys(): Map<string, KeyObject> {
    return this.trustedPublicKeys ?? loadUpdateSigningTrustStore();
  }

  private assertArtifactManifestSignature(
    release: typeof softwareReleases.$inferSelect,
    input: {
      kind: AddReleaseArtifactInput["kind"];
      fileName: string;
      sizeBytes: number;
      sha256: string;
      signature?: string | null;
      signingKeyId?: string | null;
    },
  ): void {
    if (!input.signature?.trim() || !input.signingKeyId?.trim()) {
      throw new CatalogError("INVALID_INPUT", "Thiếu chữ ký manifest CI cho artifact");
    }
    verifyUpdateArtifactManifestSignature({
      manifest: buildUpdateArtifactManifest({
        productId: release.productId,
        releasePublicId: release.publicId,
        version: release.version,
        channel: release.channel,
        platform: release.platform,
        architecture: release.architecture,
        artifactKind: input.kind,
        fileName: input.fileName,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256,
      }),
      signatureBase64: input.signature,
      keyId: input.signingKeyId,
      trustedPublicKeys: this.getTrustedPublicKeys(),
    });
  }

  private get media(): MediaService {
    return (this.mediaService ??= new MediaService(this.db));
  }

  private async loadArtifactsForReleases(
    releaseIds: string[],
  ): Promise<Map<string, ReleaseArtifactRecord[]>> {
    if (releaseIds.length === 0) return new Map();

    const artifactRows = await this.db
      .select()
      .from(releaseArtifacts)
      .where(inArray(releaseArtifacts.releaseId, releaseIds));

    if (artifactRows.length === 0) return new Map();

    const mediaIds = [...new Set(artifactRows.map((row) => row.mediaAssetId))];
    const mediaRows = await this.db
      .select({ id: mediaAssets.id, publicId: mediaAssets.publicId })
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, mediaIds));
    const mediaById = new Map(mediaRows.map((row) => [row.id, row.publicId]));

    const byRelease = new Map<string, ReleaseArtifactRecord[]>();
    for (const row of artifactRows) {
      const list = byRelease.get(row.releaseId) ?? [];
      list.push(mapArtifact(row, mediaById.get(row.mediaAssetId) ?? ""));
      byRelease.set(row.releaseId, list);
    }
    return byRelease;
  }

  private async assertMediaBelongsToRelease(
    release: typeof softwareReleases.$inferSelect,
    media: typeof mediaAssets.$inferSelect,
  ): Promise<void> {
    if (
      !mediaContextMatchesRelease({
        productId: release.productId,
        releasePublicId: release.publicId,
        mediaContext: media.context,
      })
    ) {
      throw new CatalogError("INVALID_INPUT", "Media không thuộc sản phẩm hoặc bản phát hành này");
    }
  }

  async listForProduct(productId: string): Promise<ReleaseRecord[]> {
    const rows = await this.db
      .select()
      .from(softwareReleases)
      .where(eq(softwareReleases.productId, productId))
      .orderBy(desc(softwareReleases.updatedAt));

    if (rows.length === 0) return [];

    const releaseIds = rows.map((row) => row.id);
    const mediaIds = rows.map((row) => row.mediaAssetId);
    const [mediaRows, noteRows, artifactsByRelease] = await Promise.all([
      this.db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds)),
      this.db
        .select()
        .from(releaseTranslations)
        .where(inArray(releaseTranslations.releaseId, releaseIds)),
      this.loadArtifactsForReleases(releaseIds),
    ]);

    const mediaById = new Map(mediaRows.map((row) => [row.id, row.publicId]));
    const notesByRelease = new Map<string, Array<{ locale: string; releaseNotes: string | null }>>();
    for (const note of noteRows) {
      const list = notesByRelease.get(note.releaseId) ?? [];
      list.push({ locale: note.locale, releaseNotes: note.releaseNotes });
      notesByRelease.set(note.releaseId, list);
    }

    return rows.map((row) =>
      mapRelease(
        row,
        mediaById.get(row.mediaAssetId) ?? "",
        notesByRelease.get(row.id) ?? [],
        artifactsByRelease.get(row.id) ?? [],
      ),
    );
  }

  async listPublicChangelog(options: {
    locale: string;
    productSlug?: string;
  }): Promise<PublicChangelogEntry[]> {
    const conditions = [
      eq(softwareReleases.status, "published"),
      eq(products.status, "active"),
    ];
    if (options.productSlug?.trim()) {
      conditions.push(eq(products.slug, options.productSlug.trim()));
    }

    const rows = await this.db
      .select({
        release: softwareReleases,
        productSlug: products.slug,
        productId: products.id,
      })
      .from(softwareReleases)
      .innerJoin(products, eq(softwareReleases.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(softwareReleases.publishedAt));

    if (rows.length === 0) return [];

    const productIds = [...new Set(rows.map((row) => row.productId))];
    const releaseIds = rows.map((row) => row.release.id);

    const [productTranslationRows, noteRows] = await Promise.all([
      this.db
        .select()
        .from(productTranslations)
        .where(inArray(productTranslations.productId, productIds)),
      this.db
        .select()
        .from(releaseTranslations)
        .where(inArray(releaseTranslations.releaseId, releaseIds)),
    ]);

    const notesByRelease = new Map<string, Array<{ locale: string; releaseNotes: string | null }>>();
    for (const note of noteRows) {
      const list = notesByRelease.get(note.releaseId) ?? [];
      list.push({ locale: note.locale, releaseNotes: note.releaseNotes });
      notesByRelease.set(note.releaseId, list);
    }

    const entries: PublicChangelogEntry[] = [];
    for (const row of rows) {
      if (!row.release.publishedAt) continue;
      const translations = productTranslationRows.filter((t) => t.productId === row.productId);
      const translation = requireLocaleRow(translations, options.locale);
      if (!translation) continue;

      entries.push({
        releasePublicId: row.release.publicId,
        productSlug: row.productSlug,
        productName: translation.name,
        version: row.release.version,
        platform: row.release.platform,
        architecture: row.release.architecture,
        channel: row.release.channel,
        publishedAt: row.release.publishedAt,
        releaseNotes: resolveReleaseNotes(options.locale, notesByRelease.get(row.release.id) ?? []),
      });
    }

    return sortPublicChangelog(entries);
  }

  async countPublishedForProduct(productId: string): Promise<number> {
    const rows = await this.db
      .select({ id: softwareReleases.id })
      .from(softwareReleases)
      .where(
        and(eq(softwareReleases.productId, productId), eq(softwareReleases.status, "published")),
      );
    return rows.length;
  }

  async prepareArtifactUpload(input: PrepareReleaseUploadInput) {
    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      bucket: "private",
      contentClass: "software_release",
      requireChecksum: true,
    });

    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!product) throw new CatalogError("NOT_FOUND", "Sản phẩm không tồn tại");

    return this.media.prepareUpload({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: "private",
      namespace: "releases",
      ownerType: "user",
      ownerId: input.actorUserId,
      context: `product:${input.productId}`,
    });
  }

  private async attachExistingMediaAsArtifact(
    release: typeof softwareReleases.$inferSelect,
    mediaRow: typeof mediaAssets.$inferSelect,
    input: {
      kind: AddReleaseArtifactInput["kind"];
      fileName: string;
      contentType: string;
      sizeBytes: number;
      sha256: string;
      signature?: string | null;
      signingKeyId?: string | null;
    },
  ): Promise<ReleaseArtifactRecord> {
    await this.assertMediaBelongsToRelease(release, mediaRow);

    const artifactPublicId = createPublicId("rart");
    const [artifactRow] = await this.db
      .insert(releaseArtifacts)
      .values({
        publicId: artifactPublicId,
        releaseId: release.id,
        kind: input.kind,
        mediaAssetId: mediaRow.id,
        fileName: input.fileName.trim(),
        contentType: input.contentType.trim() || "application/octet-stream",
        sizeBytes: input.sizeBytes,
        sha256: input.sha256.trim(),
        signature: input.signature?.trim() || null,
        signingKeyId: input.signingKeyId?.trim() || null,
      })
      .returning();
    if (!artifactRow) throw new CatalogError("CONFLICT", "Không thể thêm artifact");

    await this.db
      .update(mediaAssets)
      .set({ context: `release:${release.publicId}`, updatedAt: new Date() })
      .where(eq(mediaAssets.id, mediaRow.id));

    return mapArtifact(artifactRow, mediaRow.publicId);
  }

  private async insertArtifact(
    release: typeof softwareReleases.$inferSelect,
    input: {
      kind: AddReleaseArtifactInput["kind"];
      fileName: string;
      fileSize: number;
      checksumSha256: string;
      objectKey: string;
      mimeType: string;
      signature?: string | null;
      signingKeyId?: string | null;
      actorUserId?: string | null;
    },
  ): Promise<ReleaseArtifactRecord> {
    if (!input.checksumSha256?.trim()) {
      throw new CatalogError("INVALID_INPUT", "Checksum SHA-256 là bắt buộc");
    }

    this.assertArtifactManifestSignature(release, {
      kind: input.kind,
      fileName: input.fileName,
      sizeBytes: input.fileSize,
      sha256: input.checksumSha256,
      signature: input.signature,
      signingKeyId: input.signingKeyId,
    });

    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.fileSize,
      bucket: "private",
      contentClass: "software_release",
      requireChecksum: true,
      checksumSha256: input.checksumSha256,
    });

    const media = await this.media.completeUpload({
      objectKey: input.objectKey,
      bucket: "private",
      mimeType: input.mimeType,
      expectedSizeBytes: input.fileSize,
      checksumSha256: input.checksumSha256,
      ownerType: "user",
      ownerId: input.actorUserId ?? null,
      context: `product:${release.productId}`,
      contentClass: "software_release",
    });

    const [mediaRow] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, media.id))
      .limit(1);
    if (!mediaRow) throw new CatalogError("NOT_FOUND", "Media không tồn tại");
    await this.assertMediaBelongsToRelease(release, mediaRow);

    return this.attachExistingMediaAsArtifact(release, mediaRow, {
      kind: input.kind,
      fileName: input.fileName,
      contentType: input.mimeType,
      sizeBytes: input.fileSize,
      sha256: input.checksumSha256,
      signature: input.signature,
      signingKeyId: input.signingKeyId,
    });
  }

  async createDraft(input: CreateReleaseDraftInput): Promise<ReleaseRecord> {
    const version = parseReleaseVersion(input.version);
    if (!version) {
      throw new CatalogError("INVALID_INPUT", "Version phải là SemVer hợp lệ (major.minor.patch)");
    }
    const minimumSupportedVersion = input.minimumSupportedVersion?.trim()
      ? parseReleaseVersion(input.minimumSupportedVersion)
      : null;
    if (input.minimumSupportedVersion?.trim() && !minimumSupportedVersion) {
      throw new CatalogError(
        "INVALID_INPUT",
        "Phiên bản tối thiểu phải là SemVer hợp lệ (major.minor.patch)",
      );
    }
    if (!input.checksumSha256?.trim()) {
      throw new CatalogError("INVALID_INPUT", "Checksum SHA-256 là bắt buộc");
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!product) throw new CatalogError("NOT_FOUND", "Sản phẩm không tồn tại");

    const releasePublicId = createPublicId("rel");
    this.assertArtifactManifestSignature(
      {
        id: "pending",
        publicId: releasePublicId,
        productId: input.productId,
        version,
        platform: input.platform,
        architecture: input.architecture,
        channel: input.channel ?? "stable",
      } as typeof softwareReleases.$inferSelect,
      {
        kind: "installer",
        fileName: input.fileName,
        sizeBytes: input.fileSize,
        sha256: input.checksumSha256,
        signature: input.signature,
        signingKeyId: input.signingKeyId,
      },
    );

    validateUpload({
      mimeType: input.mimeType,
      sizeBytes: input.fileSize,
      bucket: "private",
      contentClass: "software_release",
      requireChecksum: true,
      checksumSha256: input.checksumSha256,
    });

    const media = await this.media.completeUpload({
      objectKey: input.objectKey,
      bucket: "private",
      mimeType: input.mimeType,
      expectedSizeBytes: input.fileSize,
      checksumSha256: input.checksumSha256,
      ownerType: "user",
      ownerId: input.actorUserId ?? null,
      context: `product:${input.productId}`,
      contentClass: "software_release",
    });

    const [row] = await this.db
      .insert(softwareReleases)
      .values({
        publicId: releasePublicId,
        productId: input.productId,
        version,
        platform: input.platform,
        architecture: input.architecture,
        channel: input.channel ?? "stable",
        mediaAssetId: media.id,
        fileName: input.fileName.trim(),
        fileSize: input.fileSize,
        checksumSha256: input.checksumSha256.trim(),
        signature: input.signature?.trim() || null,
        minimumSupportedVersion,
        mandatoryUpdate: input.mandatoryUpdate ?? false,
        status: "draft",
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Không thể tạo bản phát hành");

    await this.db
      .update(mediaAssets)
      .set({ context: `release:${releasePublicId}`, updatedAt: new Date() })
      .where(eq(mediaAssets.id, media.id));

    const [mediaRow] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, media.id))
      .limit(1);
    if (!mediaRow) throw new CatalogError("NOT_FOUND", "Media không tồn tại");

    const installerArtifact = await this.attachExistingMediaAsArtifact(row, mediaRow, {
      kind: "installer",
      fileName: input.fileName,
      contentType: input.mimeType,
      sizeBytes: input.fileSize,
      sha256: input.checksumSha256,
      signature: input.signature,
      signingKeyId: input.signingKeyId,
    });

    const notes: Array<{ locale: string; releaseNotes: string | null }> = [];
    if (input.releaseNotesVi?.trim()) {
      await this.db.insert(releaseTranslations).values({
        releaseId: row.id,
        locale: "vi",
        releaseNotes: input.releaseNotesVi.trim(),
      });
      notes.push({ locale: "vi", releaseNotes: input.releaseNotesVi.trim() });
    }
    if (input.releaseNotesEn?.trim()) {
      await this.db.insert(releaseTranslations).values({
        releaseId: row.id,
        locale: "en",
        releaseNotes: input.releaseNotesEn.trim(),
      });
      notes.push({ locale: "en", releaseNotes: input.releaseNotesEn.trim() });
    }

    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.release.create",
      resourceType: "release",
      resourceId: row.publicId,
      metadata: {
        productId: product.publicId,
        version,
        platform: input.platform,
        architecture: input.architecture,
      },
    });

    return mapRelease(row, media.publicId, notes, [installerArtifact]);
  }

  async addArtifact(input: AddReleaseArtifactInput): Promise<ReleaseArtifactRecord> {
    const [release] = await this.db
      .select()
      .from(softwareReleases)
      .where(eq(softwareReleases.id, input.releaseId))
      .limit(1);
    if (!release) throw new CatalogError("NOT_FOUND", "Bản phát hành không tồn tại");
    if (release.status !== "draft") {
      throw new CatalogError("INVALID_INPUT", "Chỉ có thể thêm artifact vào bản phát hành draft");
    }

    const artifact = await this.insertArtifact(release, input);

    await this.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "catalog.release.artifact.add",
      resourceType: "release",
      resourceId: release.publicId,
      metadata: { kind: input.kind, fileName: input.fileName },
    });

    return artifact;
  }

  async listArtifacts(releaseId: string): Promise<ReleaseArtifactRecord[]> {
    const artifactsByRelease = await this.loadArtifactsForReleases([releaseId]);
    return artifactsByRelease.get(releaseId) ?? [];
  }

  async getPublishReadiness(releaseId: string): Promise<ReleasePublishReadiness> {
    const [release] = await this.db
      .select()
      .from(softwareReleases)
      .where(eq(softwareReleases.id, releaseId))
      .limit(1);
    if (!release) throw new CatalogError("NOT_FOUND", "Bản phát hành không tồn tại");

    const artifacts = await this.listArtifacts(releaseId);
    const notes = await this.db
      .select()
      .from(releaseTranslations)
      .where(eq(releaseTranslations.releaseId, releaseId));

    const mediaIds = artifacts.map((artifact) => artifact.mediaAssetId);
    const mediaRows =
      mediaIds.length > 0
        ? await this.db
            .select({ id: mediaAssets.id, objectKey: mediaAssets.objectKey })
            .from(mediaAssets)
            .where(inArray(mediaAssets.id, mediaIds))
        : [];
    const mediaById = new Map(mediaRows.map((row) => [row.id, { objectKey: row.objectKey }]));

    return assessReleasePublishReadiness({
      release,
      artifacts,
      notes: notes.map((note) => ({ locale: note.locale, releaseNotes: note.releaseNotes })),
      mediaById,
      storage: this.privateStorage,
      trustedPublicKeys: this.getTrustedPublicKeys(),
    });
  }

  async publish(releaseId: string, actorUserId?: string | null): Promise<ReleaseRecord> {
    const [existingPublished] = await this.db
      .select()
      .from(softwareReleases)
      .where(and(eq(softwareReleases.id, releaseId), eq(softwareReleases.status, "published")))
      .limit(1);
    if (existingPublished) {
      return (await this.getByPublicId(existingPublished.publicId))!;
    }

    const readiness = await this.getPublishReadiness(releaseId);
    if (!readiness.ready) {
      throw new CatalogError(
        "INVALID_INPUT",
        readiness.blockers[0] ?? "Release chưa đủ điều kiện publish",
      );
    }

    const published = await this.db.transaction(async (tx) => {
      const [draft] = await tx
        .select()
        .from(softwareReleases)
        .where(and(eq(softwareReleases.id, releaseId), eq(softwareReleases.status, "draft")))
        .limit(1);
      if (!draft) {
        throw new CatalogError("INVALID_INPUT", "Bản phát hành không còn ở trạng thái draft");
      }

      const [row] = await tx
        .update(softwareReleases)
        .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(softwareReleases.id, releaseId), eq(softwareReleases.status, "draft")))
        .returning();
      if (!row) {
        throw new CatalogError("CONFLICT", "Publish đồng thời — thử lại");
      }
      return row;
    });

    const artifacts = await this.listArtifacts(releaseId);
    const [media] = await this.db
      .select({ publicId: mediaAssets.publicId })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, published.mediaAssetId))
      .limit(1);
    const notes = await this.db
      .select()
      .from(releaseTranslations)
      .where(eq(releaseTranslations.releaseId, published.id));

    await this.audit.record({
      actorUserId: actorUserId ?? null,
      action: "catalog.release.publish",
      resourceType: "release",
      resourceId: published.publicId,
      metadata: {
        result: "published",
        artifactCount: artifacts.length,
        verifiedArtifactCount: readiness.artifacts.filter((item) => item.state === "verified").length,
      },
    });

    return mapRelease(
      published,
      media?.publicId ?? "",
      notes.map((n) => ({ locale: n.locale, releaseNotes: n.releaseNotes })),
      artifacts,
    );
  }

  async getByPublicId(publicId: string): Promise<ReleaseRecord | null> {
    const [row] = await this.db
      .select()
      .from(softwareReleases)
      .where(eq(softwareReleases.publicId, publicId))
      .limit(1);
    if (!row) return null;

    const [media] = await this.db
      .select({ publicId: mediaAssets.publicId })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, row.mediaAssetId))
      .limit(1);
    const notes = await this.db
      .select()
      .from(releaseTranslations)
      .where(eq(releaseTranslations.releaseId, row.id));
    const artifactsByRelease = await this.loadArtifactsForReleases([row.id]);

    return mapRelease(
      row,
      media?.publicId ?? "",
      notes.map((n) => ({ locale: n.locale, releaseNotes: n.releaseNotes })),
      artifactsByRelease.get(row.id) ?? [],
    );
  }

  async findLatestCompatible(query: LatestReleaseQuery): Promise<ReleaseRecord | null> {
    const channel = query.channel ?? "stable";
    const currentVersion = parseReleaseVersion(query.currentVersion ?? "");
    if (!currentVersion) {
      throw new CatalogError(
        "INVALID_INPUT",
        "currentVersion là bắt buộc và phải là SemVer hợp lệ (major.minor.patch)",
      );
    }

    const rows = await this.db
      .select()
      .from(softwareReleases)
      .where(
        and(
          eq(softwareReleases.productId, query.productId),
          eq(softwareReleases.status, "published"),
        ),
      )
      .orderBy(desc(softwareReleases.publishedAt));

    const picked = pickLatestCompatibleRelease(rows, {
      platform: query.platform,
      architecture: query.architecture,
      channel,
      currentVersion,
    });
    if (!picked) return null;

    return this.getByPublicId(picked.publicId);
  }
}

export function createReleaseService(
  db: Database,
  audit: AuditService,
  media?: MediaService,
): ReleaseService {
  return new ReleaseService(db, audit, media);
}

export { PLATFORM_LABEL as releasePlatformLabel };
