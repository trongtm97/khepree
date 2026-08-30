import { createHash } from "node:crypto";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import {
  contentCategories,
  contentCategoryTranslations,
  contentEntries,
  contentVersions,
  createPublicId,
  mediaAssets,
  requireDb,
  user,
  withTransaction,
  type Database,
} from "@khepree/db";
import {
  getPrivateObjectStorage,
  type ObjectStorage,
  type StorageBucket,
} from "@khepree/storage";
import { buildContentRevalidationPlan } from "./revalidation";
import type {
  ContentStatus,
  ContentType,
  ContentVersionRecord,
  CreateDraftInput,
  CreateDraftVersionInput,
  PublishedContent,
  UpdateContentInput,
} from "./types";

function mapVersion(
  row: typeof contentVersions.$inferSelect,
  entry: typeof contentEntries.$inferSelect,
  meta: {
    featuredMediaPublicId?: string | null;
    authorName?: string | null;
    categoryName?: string | null;
  } = {},
): ContentVersionRecord {
  return {
    id: row.id,
    entryId: row.entryId,
    entryPublicId: entry.publicId,
    slug: entry.slug,
    contentType: entry.contentType,
    locale: row.locale,
    versionNumber: row.versionNumber,
    title: row.title,
    excerpt: row.excerpt,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    bodyStorageProvider: row.bodyStorageProvider,
    bodyStorageBucket: row.bodyStorageBucket,
    bodyObjectKey: row.bodyObjectKey,
    featuredMediaId: row.featuredMediaId,
    featuredMediaPublicId: meta.featuredMediaPublicId ?? null,
    authorUserId: row.authorUserId,
    authorName: meta.authorName ?? null,
    categoryId: row.categoryId,
    categoryName: meta.categoryName ?? null,
    scheduledAt: row.scheduledAt,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPublishedContent(
  entry: typeof contentEntries.$inferSelect,
  version: typeof contentVersions.$inferSelect,
): PublishedContent {
  return {
    entryPublicId: entry.publicId,
    slug: entry.slug,
    contentType: entry.contentType,
    locale: version.locale,
    versionNumber: version.versionNumber,
    title: version.title,
    excerpt: version.excerpt,
    seoTitle: version.seoTitle,
    seoDescription: version.seoDescription,
    bodyObjectKey: version.bodyObjectKey,
    featuredMediaPublicId: null,
    authorUserId: version.authorUserId,
    authorName: null,
    categoryName: null,
    publishedAt: version.publishedAt,
    updatedAt: version.updatedAt,
  };
}

/** Immutable object key for a content version body — never reuse across version numbers. */
export function bodyObjectKeyFor(entryId: string, locale: string, versionNumber: number): string {
  return `prv/content/${entryId}/${locale}/v${versionNumber}.md`;
}

/** Pure helper for concurrency-safe version allocation (max query + 1). Unique conflict retries in createDraftVersion. */
export function nextContentVersionNumber(maxVersion: number | null | undefined): number {
  return (maxVersion ?? 0) + 1;
}

/** CMS version allocation: retry on unique (entry_id, locale, version_number). */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const record = current as { code?: string; cause?: unknown };
    if (record.code === "23505") return true;
    current = record.cause;
  }
  return /duplicate key|unique constraint/i.test(error instanceof Error ? error.message : String(error));
}

type BodyMeta = {
  bodyStorageProvider: "r2" | "mock" | null;
  bodyStorageBucket: string | null;
  bodyObjectKey: string | null;
};

const emptyBodyMeta: BodyMeta = {
  bodyStorageProvider: null,
  bodyStorageBucket: null,
  bodyObjectKey: null,
};

async function storeBody(
  storage: ObjectStorage,
  key: string,
  body: string,
): Promise<{ provider: "r2" | "mock"; bucket: StorageBucket }> {
  await storage.putObject({
    key,
    body,
    contentType: "text/markdown",
    bucket: "private",
  });
  return {
    provider: storage.provider === "r2" ? "r2" : "mock",
    bucket: "private",
  };
}

async function bodyMetaFor(
  storage: ObjectStorage,
  entryId: string,
  locale: string,
  versionNumber: number,
  body: string | null | undefined,
): Promise<BodyMeta> {
  if (!body) return emptyBodyMeta;

  const objectKey = bodyObjectKeyFor(entryId, locale, versionNumber);
  const stored = await storeBody(storage, objectKey, body);
  return {
    bodyStorageProvider: stored.provider,
    bodyStorageBucket: stored.bucket,
    bodyObjectKey: objectKey,
  };
}

async function resolveFeaturedMediaId(
  db: Database,
  publicId: string | null | undefined,
): Promise<string | null> {
  if (!publicId?.trim()) return null;
  const [row] = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(eq(mediaAssets.publicId, publicId.trim()))
    .limit(1);
  return row?.id ?? null;
}

async function versionMeta(
  db: Database,
  row: typeof contentVersions.$inferSelect,
): Promise<{ featuredMediaPublicId: string | null; authorName: string | null; categoryName: string | null }> {
  const [featured, author, category] = await Promise.all([
    row.featuredMediaId
      ? db
          .select({ publicId: mediaAssets.publicId })
          .from(mediaAssets)
          .where(eq(mediaAssets.id, row.featuredMediaId))
          .limit(1)
          .then((rows) => rows[0]?.publicId ?? null)
      : Promise.resolve(null),
    row.authorUserId
      ? db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, row.authorUserId))
          .limit(1)
          .then((rows) => rows[0]?.name ?? null)
      : Promise.resolve(null),
    row.categoryId
      ? db
          .select({ name: contentCategoryTranslations.name })
          .from(contentCategoryTranslations)
          .where(eq(contentCategoryTranslations.categoryId, row.categoryId))
          .limit(1)
          .then((rows) => rows[0]?.name ?? null)
      : Promise.resolve(null),
  ]);
  return { featuredMediaPublicId: featured, authorName: author, categoryName: category };
}

export class ContentService {
  constructor(
    private db: Database = requireDb(),
    private storageOverride?: ObjectStorage,
  ) {}

  private get storage(): ObjectStorage {
    return this.storageOverride ?? getPrivateObjectStorage();
  }

  private async enrichVersion(
    row: typeof contentVersions.$inferSelect,
    entry: typeof contentEntries.$inferSelect,
  ): Promise<ContentVersionRecord> {
    const meta = await versionMeta(this.db, row);
    return mapVersion(row, entry, meta);
  }

  async createDraft(input: CreateDraftInput): Promise<ContentVersionRecord> {
    const entry = await withTransaction(this.db, async (tx) => {
      const [row] = await tx
        .insert(contentEntries)
        .values({
          publicId: createPublicId("cnt"),
          slug: input.slug,
          contentType: input.contentType,
        })
        .returning();

      if (!row) throw new Error("Failed to create content entry");
      return row;
    });

    const versionNumber = 1;
    const bodyMeta = await bodyMetaFor(
      this.storage,
      entry.id,
      input.locale,
      versionNumber,
      input.body,
    );

    const featuredMediaId = await resolveFeaturedMediaId(this.db, input.featuredMediaPublicId);

    try {
      const [version] = await this.db
        .insert(contentVersions)
        .values({
          entryId: entry.id,
          locale: input.locale,
          versionNumber,
          title: input.title,
          excerpt: input.excerpt ?? null,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          featuredMediaId,
          authorUserId: input.authorUserId ?? null,
          categoryId: input.categoryId ?? null,
          scheduledAt: input.scheduledAt ?? null,
          ...bodyMeta,
          status: "DRAFT",
        })
        .returning();

      if (!version) throw new Error("Failed to create content version");
      return this.enrichVersion(version, entry);
    } catch (error) {
      if (bodyMeta.bodyObjectKey) {
        await this.storage.deleteObject(bodyMeta.bodyObjectKey, "private").catch(() => undefined);
      }
      throw error;
    }
  }

  async createDraftVersion(input: CreateDraftVersionInput): Promise<ContentVersionRecord> {
    let allocated: { entry: typeof contentEntries.$inferSelect; version: typeof contentVersions.$inferSelect; versionNumber: number } | undefined;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        allocated = await withTransaction(this.db, async (tx) => {
          const [entry] = await tx
            .select()
            .from(contentEntries)
            .where(and(eq(contentEntries.id, input.entryId), isNull(contentEntries.deletedAt)))
            .limit(1);

          if (!entry) throw new Error("Content entry not found");

          const [maxRow] = await tx
            .select({ maxVersion: max(contentVersions.versionNumber) })
            .from(contentVersions)
            .where(
              and(eq(contentVersions.entryId, input.entryId), eq(contentVersions.locale, input.locale)),
            );

          const versionNumber = nextContentVersionNumber(maxRow?.maxVersion);

          const [version] = await tx
            .insert(contentVersions)
            .values({
              entryId: input.entryId,
              locale: input.locale,
              versionNumber,
              title: input.title,
              excerpt: input.excerpt ?? null,
              seoTitle: input.seoTitle ?? null,
              seoDescription: input.seoDescription ?? null,
              featuredMediaId: input.featuredMediaId ?? null,
              authorUserId: input.authorUserId ?? null,
              categoryId: input.categoryId ?? null,
              ...emptyBodyMeta,
              status: "DRAFT",
            })
            .returning();

          if (!version) throw new Error("Failed to create content version");
          return { entry, version, versionNumber };
        });
        break;
      } catch (error) {
        if (!isUniqueViolation(error) || attempt === 7) throw error;
      }
    }
    if (!allocated) throw new Error("Failed to allocate content version");

    if (!input.body) {
      return this.enrichVersion(allocated.version, allocated.entry);
    }

    const bodyMeta = await bodyMetaFor(
      this.storage,
      input.entryId,
      input.locale,
      allocated.versionNumber,
      input.body,
    );

    try {
      const [updated] = await this.db
        .update(contentVersions)
        .set({ ...bodyMeta, updatedAt: new Date() })
        .where(eq(contentVersions.id, allocated.version.id))
        .returning();

      if (!updated) throw new Error("Failed to update content version body");
      return this.enrichVersion(updated, allocated.entry);
    } catch (error) {
      if (bodyMeta.bodyObjectKey) {
        await this.storage.deleteObject(bodyMeta.bodyObjectKey, "private").catch(() => undefined);
      }
      throw error;
    }
  }

  async updateDraft(input: UpdateContentInput): Promise<ContentVersionRecord> {
    const [existing] = await this.db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.id, input.versionId))
      .limit(1);

    if (!existing) throw new Error("Content version not found");
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft versions can be updated");
    }

    const [entry] = await this.db
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.id, existing.entryId), isNull(contentEntries.deletedAt)))
      .limit(1);

    if (!entry) throw new Error("Content entry not found");

    let bodyMeta: BodyMeta = {
      bodyStorageProvider: existing.bodyStorageProvider,
      bodyStorageBucket: existing.bodyStorageBucket,
      bodyObjectKey: existing.bodyObjectKey,
    };

    if (input.body !== undefined) {
      if (input.body) {
        const objectKey = bodyObjectKeyFor(entry.id, existing.locale, existing.versionNumber);
        const stored = await storeBody(this.storage, objectKey, input.body);
        bodyMeta = {
          bodyStorageProvider: stored.provider,
          bodyStorageBucket: stored.bucket,
          bodyObjectKey: objectKey,
        };
      } else {
        bodyMeta = emptyBodyMeta;
      }
    }

    let featuredMediaId = existing.featuredMediaId;
    if (input.featuredMediaPublicId !== undefined) {
      featuredMediaId = await resolveFeaturedMediaId(this.db, input.featuredMediaPublicId);
    }

    const [updated] = await this.db
      .update(contentVersions)
      .set({
        title: input.title ?? existing.title,
        excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        seoDescription:
          input.seoDescription !== undefined ? input.seoDescription : existing.seoDescription,
        featuredMediaId,
        authorUserId: input.authorUserId !== undefined ? input.authorUserId : existing.authorUserId,
        categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
        scheduledAt: input.scheduledAt !== undefined ? input.scheduledAt : existing.scheduledAt,
        ...bodyMeta,
        updatedAt: new Date(),
      })
      .where(eq(contentVersions.id, input.versionId))
      .returning();

    if (!updated) throw new Error("Failed to update content version");
    return this.enrichVersion(updated, entry);
  }

  async publish(versionId: string): Promise<{
    version: ContentVersionRecord;
    revalidation: ReturnType<typeof buildContentRevalidationPlan>;
  }> {
    const result = await withTransaction(this.db, async (tx) => {
      const [target] = await tx
        .select()
        .from(contentVersions)
        .where(eq(contentVersions.id, versionId))
        .limit(1);

      if (!target) throw new Error("Content version not found");
      if (target.status !== "DRAFT") {
        throw new Error("Only draft versions can be published");
      }

      const [entry] = await tx
        .select()
        .from(contentEntries)
        .where(and(eq(contentEntries.id, target.entryId), isNull(contentEntries.deletedAt)))
        .limit(1);

      if (!entry) throw new Error("Content entry not found");

      await tx
        .update(contentVersions)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(
          and(
            eq(contentVersions.entryId, target.entryId),
            eq(contentVersions.locale, target.locale),
            eq(contentVersions.status, "PUBLISHED"),
          ),
        );

      const [published] = await tx
        .update(contentVersions)
        .set({
          status: "PUBLISHED",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contentVersions.id, versionId))
        .returning();

      if (!published) throw new Error("Failed to publish content version");

      return {
        version: await this.enrichVersion(published, entry),
        revalidation: buildContentRevalidationPlan({
          slug: entry.slug,
          contentType: entry.contentType,
          locale: published.locale,
        }),
      };
    });

    return result;
  }

  async archive(versionId: string): Promise<ContentVersionRecord> {
    const [existing] = await this.db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.id, versionId))
      .limit(1);

    if (!existing) throw new Error("Content version not found");

    const [entry] = await this.db
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.id, existing.entryId), isNull(contentEntries.deletedAt)))
      .limit(1);

    if (!entry) throw new Error("Content entry not found");

    const [archived] = await this.db
      .update(contentVersions)
      .set({ status: "ARCHIVED", updatedAt: new Date() })
      .where(eq(contentVersions.id, versionId))
      .returning();

    if (!archived) throw new Error("Failed to archive content version");
    return this.enrichVersion(archived, entry);
  }

  async getVersion(versionId: string): Promise<ContentVersionRecord | null> {
    const [row] = await this.db
      .select({ version: contentVersions, entry: contentEntries })
      .from(contentVersions)
      .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
      .where(and(eq(contentVersions.id, versionId), isNull(contentEntries.deletedAt)))
      .limit(1);
    if (!row) return null;
    return this.enrichVersion(row.version, row.entry);
  }

  async listEntryVersions(entryId: string, locale?: string): Promise<ContentVersionRecord[]> {
    const rows = await this.db
      .select({ version: contentVersions, entry: contentEntries })
      .from(contentVersions)
      .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
      .where(
        locale
          ? and(eq(contentVersions.entryId, entryId), eq(contentVersions.locale, locale))
          : eq(contentVersions.entryId, entryId),
      )
      .orderBy(desc(contentVersions.versionNumber));

    const result: ContentVersionRecord[] = [];
    for (const row of rows) {
      result.push(await this.enrichVersion(row.version, row.entry));
    }
    return result;
  }

  async createDraftFromPublished(input: {
    entryId: string;
    locale: string;
  }): Promise<ContentVersionRecord> {
    const [published] = await this.db
      .select()
      .from(contentVersions)
      .where(
        and(
          eq(contentVersions.entryId, input.entryId),
          eq(contentVersions.locale, input.locale),
          eq(contentVersions.status, "PUBLISHED"),
        ),
      )
      .orderBy(desc(contentVersions.versionNumber))
      .limit(1);
    if (!published) throw new Error("No published version to fork");

    const body = published.bodyObjectKey
      ? await this.getBody({ bodyObjectKey: published.bodyObjectKey })
      : null;

    return this.createDraftVersion({
      entryId: input.entryId,
      locale: input.locale,
      title: published.title,
      excerpt: published.excerpt,
      seoTitle: published.seoTitle,
      seoDescription: published.seoDescription,
      body,
      featuredMediaId: published.featuredMediaId,
      authorUserId: published.authorUserId,
      categoryId: published.categoryId,
    });
  }

  async listCategories(locale: string) {
    const rows = await this.db.select().from(contentCategories).orderBy(contentCategories.slug);
    if (rows.length === 0) return [];
    const translations = await this.db
      .select()
      .from(contentCategoryTranslations)
      .where(eq(contentCategoryTranslations.locale, locale));
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: translations.find((t) => t.categoryId === row.id)?.name ?? row.slug,
    }));
  }

  private async findPublishedVersion(entryId: string, locale: string) {
    const [version] = await this.db
      .select()
      .from(contentVersions)
      .where(
        and(
          eq(contentVersions.entryId, entryId),
          eq(contentVersions.locale, locale),
          eq(contentVersions.status, "PUBLISHED"),
        ),
      )
      .orderBy(desc(contentVersions.versionNumber))
      .limit(1);
    return version ?? null;
  }

  async getPublished(input: {
    slug: string;
    contentType: ContentType;
    locale: string;
  }): Promise<PublishedContent | null> {
    const [entry] = await this.db
      .select()
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.slug, input.slug),
          eq(contentEntries.contentType, input.contentType),
          isNull(contentEntries.deletedAt),
        ),
      )
      .limit(1);

    if (!entry) return null;

    const version = await this.findPublishedVersion(entry.id, input.locale);

    if (!version) return null;

    const meta = await versionMeta(this.db, version);
    return {
      ...toPublishedContent(entry, version),
      featuredMediaPublicId: meta.featuredMediaPublicId,
      authorUserId: version.authorUserId,
      authorName: meta.authorName,
      categoryName: meta.categoryName,
    };
  }

  async getPreviewVersion(versionId: string): Promise<(PublishedContent & { versionId: string }) | null> {
    const version = await this.getVersion(versionId);
    if (!version || version.status === "ARCHIVED") return null;
    return {
      entryPublicId: version.entryPublicId,
      slug: version.slug,
      contentType: version.contentType,
      locale: version.locale,
      versionNumber: version.versionNumber,
      title: version.title,
      excerpt: version.excerpt,
      seoTitle: version.seoTitle,
      seoDescription: version.seoDescription,
      bodyObjectKey: version.bodyObjectKey,
      featuredMediaPublicId: version.featuredMediaPublicId,
      authorUserId: version.authorUserId,
      authorName: version.authorName,
      categoryName: version.categoryName,
      publishedAt: version.publishedAt,
      updatedAt: version.updatedAt,
      versionId: version.id,
    };
  }

  async listPublished(input: {
    contentType: ContentType;
    locale: string;
  }): Promise<PublishedContent[]> {
    const rows = await this.db
      .select({ version: contentVersions, entry: contentEntries })
      .from(contentVersions)
      .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
      .where(
        and(
          eq(contentEntries.contentType, input.contentType),
          eq(contentVersions.locale, input.locale),
          eq(contentVersions.status, "PUBLISHED"),
          isNull(contentEntries.deletedAt),
        ),
      )
      .orderBy(desc(contentVersions.versionNumber), desc(contentVersions.publishedAt));

    const seen = new Set<string>();
    const published: PublishedContent[] = [];
    for (const row of rows) {
      if (seen.has(row.entry.id)) continue;
      seen.add(row.entry.id);
      published.push(toPublishedContent(row.entry, row.version));
    }
    return published;
  }

  /** Fetch body from storage once per call — callers should cache at request scope. */
  async getBody(version: Pick<ContentVersionRecord, "bodyObjectKey">): Promise<string | null> {
    if (!version.bodyObjectKey) return null;
    const buf = await this.storage.getObject(version.bodyObjectKey, "private");
    return buf?.toString("utf8") ?? null;
  }

  async listDrafts(locale?: string): Promise<ContentVersionRecord[]> {
    const rows = await this.db
      .select({ version: contentVersions, entry: contentEntries })
      .from(contentVersions)
      .innerJoin(contentEntries, eq(contentVersions.entryId, contentEntries.id))
      .where(
        locale
          ? and(
              eq(contentVersions.status, "DRAFT"),
              isNull(contentEntries.deletedAt),
              eq(contentVersions.locale, locale),
            )
          : and(eq(contentVersions.status, "DRAFT"), isNull(contentEntries.deletedAt)),
      )
      .orderBy(desc(contentVersions.updatedAt));

    return rows.map((r) => mapVersion(r.version, r.entry));
  }
}

export function createContentService(db?: Database, storage?: ObjectStorage): ContentService {
  return new ContentService(db, storage);
}

/** Stable checksum helper for upload verification metadata. */
export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export type { ContentStatus };
