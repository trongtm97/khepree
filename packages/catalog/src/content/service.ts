import { createHash } from "node:crypto";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import {
  contentEntries,
  contentVersions,
  createPublicId,
  requireDb,
  withTransaction,
  type Database,
} from "@khepree/db";
import { DEFAULT_LOCALE } from "@khepree/config";
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
    publishedAt: version.publishedAt,
  };
}

/** Immutable object key for a content version body — never reuse across version numbers. */
export function bodyObjectKeyFor(entryId: string, locale: string, versionNumber: number): string {
  return `prv/content/${entryId}/${locale}/v${versionNumber}.md`;
}

/** Pure helper for concurrency-safe version allocation (max query + 1). */
export function nextContentVersionNumber(maxVersion: number | null | undefined): number {
  return (maxVersion ?? 0) + 1;
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

export class ContentService {
  constructor(
    private db: Database = requireDb(),
    private storageOverride?: ObjectStorage,
  ) {}

  private get storage(): ObjectStorage {
    return this.storageOverride ?? getPrivateObjectStorage();
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
        ...bodyMeta,
        status: "DRAFT",
      })
      .returning();

    if (!version) throw new Error("Failed to create content version");
    return mapVersion(version, entry);
  }

  async createDraftVersion(input: CreateDraftVersionInput): Promise<ContentVersionRecord> {
    const allocated = await withTransaction(this.db, async (tx) => {
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
          ...emptyBodyMeta,
          status: "DRAFT",
        })
        .returning();

      if (!version) throw new Error("Failed to create content version");
      return { entry, version, versionNumber };
    });

    if (!input.body) {
      return mapVersion(allocated.version, allocated.entry);
    }

    const bodyMeta = await bodyMetaFor(
      this.storage,
      input.entryId,
      input.locale,
      allocated.versionNumber,
      input.body,
    );

    const [updated] = await this.db
      .update(contentVersions)
      .set({ ...bodyMeta, updatedAt: new Date() })
      .where(eq(contentVersions.id, allocated.version.id))
      .returning();

    if (!updated) throw new Error("Failed to update content version body");
    return mapVersion(updated, allocated.entry);
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

    const [updated] = await this.db
      .update(contentVersions)
      .set({
        title: input.title ?? existing.title,
        excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        seoDescription:
          input.seoDescription !== undefined ? input.seoDescription : existing.seoDescription,
        ...bodyMeta,
        updatedAt: new Date(),
      })
      .where(eq(contentVersions.id, input.versionId))
      .returning();

    if (!updated) throw new Error("Failed to update content version");
    return mapVersion(updated, entry);
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
        version: mapVersion(published, entry),
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
    return mapVersion(archived, entry);
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

    const version =
      (await this.findPublishedVersion(entry.id, input.locale)) ??
      (input.locale === DEFAULT_LOCALE
        ? null
        : await this.findPublishedVersion(entry.id, DEFAULT_LOCALE));

    if (!version) return null;

    return toPublishedContent(entry, version);
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
