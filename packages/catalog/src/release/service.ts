import { and, desc, eq, inArray } from "drizzle-orm";
import {
  createPublicId,
  mediaAssets,
  productTranslations,
  products,
  releaseTranslations,
  softwareReleases,
  type AuditService,
  type Database,
  type ReleasePlatform,
} from "@khepree/db";
import { validateUpload } from "@khepree/storage";
import { CatalogError } from "../product/admin";
import { requireLocaleRow } from "../product/i18n";
import { MediaService } from "../media/service";
import { resolveReleaseNotes, sortPublicChangelog } from "./public-changelog";
import type {
  CreateReleaseDraftInput,
  LatestReleaseQuery,
  PrepareReleaseUploadInput,
  PublicChangelogEntry,
  ReleaseRecord,
} from "./types";
import { isReleaseVersionNewer, meetsMinimumVersion, compareReleaseVersions } from "./version";

const PLATFORM_LABEL: Record<ReleasePlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

function mapRelease(
  row: typeof softwareReleases.$inferSelect,
  mediaPublicId: string,
  notes: Array<{ locale: string; releaseNotes: string | null }>,
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

  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    media?: MediaService,
  ) {
    this.mediaService = media;
  }

  private get media(): MediaService {
    return (this.mediaService ??= new MediaService(this.db));
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
    const [mediaRows, noteRows] = await Promise.all([
      this.db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds)),
      this.db
        .select()
        .from(releaseTranslations)
        .where(inArray(releaseTranslations.releaseId, releaseIds)),
    ]);

    const mediaById = new Map(mediaRows.map((row) => [row.id, row.publicId]));
    const notesByRelease = new Map<string, Array<{ locale: string; releaseNotes: string | null }>>();
    for (const note of noteRows) {
      const list = notesByRelease.get(note.releaseId) ?? [];
      list.push({ locale: note.locale, releaseNotes: note.releaseNotes });
      notesByRelease.set(note.releaseId, list);
    }

    return rows.map((row) =>
      mapRelease(row, mediaById.get(row.mediaAssetId) ?? "", notesByRelease.get(row.id) ?? []),
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

  async createDraft(input: CreateReleaseDraftInput): Promise<ReleaseRecord> {
    const version = input.version.trim();
    if (!/^\d+\.\d+\.\d+/.test(version)) {
      throw new CatalogError("INVALID_INPUT", "Version phải theo dạng major.minor.patch");
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
    });

    const releasePublicId = createPublicId("rel");
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
        minimumSupportedVersion: input.minimumSupportedVersion?.trim() || null,
        mandatoryUpdate: input.mandatoryUpdate ?? false,
        status: "draft",
      })
      .returning();
    if (!row) throw new CatalogError("CONFLICT", "Không thể tạo bản phát hành");

    await this.db
      .update(mediaAssets)
      .set({ context: `release:${releasePublicId}`, updatedAt: new Date() })
      .where(eq(mediaAssets.id, media.id));

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

    return mapRelease(row, media.publicId, notes);
  }

  async publish(releaseId: string, actorUserId?: string | null): Promise<ReleaseRecord> {
    const [existing] = await this.db
      .select()
      .from(softwareReleases)
      .where(eq(softwareReleases.id, releaseId))
      .limit(1);
    if (!existing) throw new CatalogError("NOT_FOUND", "Bản phát hành không tồn tại");
    if (existing.status === "published") {
      throw new CatalogError("INVALID_INPUT", "Bản phát hành đã được xuất bản");
    }

    const [row] = await this.db
      .update(softwareReleases)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(softwareReleases.id, releaseId))
      .returning();
    if (!row) throw new CatalogError("NOT_FOUND", "Bản phát hành không tồn tại");

    const [media] = await this.db
      .select({ publicId: mediaAssets.publicId })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, row.mediaAssetId))
      .limit(1);
    const notes = await this.db
      .select()
      .from(releaseTranslations)
      .where(eq(releaseTranslations.releaseId, row.id));

    await this.audit.record({
      actorUserId: actorUserId ?? null,
      action: "catalog.release.publish",
      resourceType: "release",
      resourceId: row.publicId,
    });

    return mapRelease(
      row,
      media?.publicId ?? "",
      notes.map((n) => ({ locale: n.locale, releaseNotes: n.releaseNotes })),
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

    return mapRelease(
      row,
      media?.publicId ?? "",
      notes.map((n) => ({ locale: n.locale, releaseNotes: n.releaseNotes })),
    );
  }

  async findLatestCompatible(query: LatestReleaseQuery): Promise<ReleaseRecord | null> {
    const channel = query.channel ?? "stable";
    const rows = await this.db
      .select()
      .from(softwareReleases)
      .where(
        and(
          eq(softwareReleases.productId, query.productId),
          eq(softwareReleases.platform, query.platform),
          eq(softwareReleases.channel, channel),
          eq(softwareReleases.status, "published"),
        ),
      )
      .orderBy(desc(softwareReleases.publishedAt));

    const archMatch = rows.filter(
      (row) =>
        row.architecture === query.architecture || row.architecture === "universal",
    );

    const eligible = archMatch.filter((row) =>
      isReleaseVersionNewer(row.version, query.currentVersion ?? null),
    );

    const sorted = eligible.sort((a, b) => compareReleaseVersions(b.version, a.version));

    for (const row of sorted) {
      if (!meetsMinimumVersion(row.version, row.minimumSupportedVersion)) continue;
      const release = await this.getByPublicId(row.publicId);
      if (release) return release;
    }
    return null;
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
