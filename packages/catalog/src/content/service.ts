import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  contentEntries,
  contentVersions,
  createPublicId,
  requireDb,
  withTransaction,
  type Database,
} from "@khepree/db";
import {
  getObjectStorage,
  type ObjectStorage,
  type StorageBucket,
} from "@khepree/storage";
import { buildContentRevalidationPlan } from "./revalidation";
import type {
  ContentStatus,
  ContentType,
  ContentVersionRecord,
  CreateDraftInput,
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

function bodyObjectKeyFor(entryId: string, locale: string, versionNumber: number): string {
  return `prv/content/${entryId}/${locale}/v${versionNumber}.md`;
}

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

export class ContentService {
  constructor(
    private db: Database = requireDb(),
    private storage: ObjectStorage = getObjectStorage(),
  ) {}

  async createDraft(input: CreateDraftInput): Promise<ContentVersionRecord> {
    return withTransaction(this.db, async (tx) => {
      const [entry] = await tx
        .insert(contentEntries)
        .values({
          publicId: createPublicId("cnt"),
          slug: input.slug,
          contentType: input.contentType,
        })
        .returning();

      if (!entry) throw new Error("Failed to create content entry");

      const versionNumber = 1;
      let bodyMeta: {
        bodyStorageProvider: "r2" | "mock" | null;
        bodyStorageBucket: string | null;
        bodyObjectKey: string | null;
      } = {
        bodyStorageProvider: null,
        bodyStorageBucket: null,
        bodyObjectKey: null,
      };

      if (input.body) {
        const objectKey = bodyObjectKeyFor(entry.id, input.locale, versionNumber);
        const stored = await storeBody(this.storage, objectKey, input.body);
        bodyMeta = {
          bodyStorageProvider: stored.provider,
          bodyStorageBucket: stored.bucket,
          bodyObjectKey: objectKey,
        };
      }

      const [version] = await tx
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
    });
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
      .where(eq(contentEntries.id, existing.entryId))
      .limit(1);

    if (!entry) throw new Error("Content entry not found");

    let bodyMeta = {
      bodyStorageProvider: existing.bodyStorageProvider,
      bodyStorageBucket: existing.bodyStorageBucket,
      bodyObjectKey: existing.bodyObjectKey,
    };

    if (input.body !== undefined) {
      const objectKey =
        existing.bodyObjectKey ??
        bodyObjectKeyFor(entry.id, existing.locale, existing.versionNumber);
      if (input.body) {
        const stored = await storeBody(this.storage, objectKey, input.body);
        bodyMeta = {
          bodyStorageProvider: stored.provider,
          bodyStorageBucket: stored.bucket,
          bodyObjectKey: objectKey,
        };
      } else {
        bodyMeta = {
          bodyStorageProvider: null,
          bodyStorageBucket: null,
          bodyObjectKey: null,
        };
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

      const [entry] = await tx
        .select()
        .from(contentEntries)
        .where(eq(contentEntries.id, target.entryId))
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
      .where(eq(contentEntries.id, existing.entryId))
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
        ),
      )
      .limit(1);

    if (!entry) return null;

    const [version] = await this.db
      .select()
      .from(contentVersions)
      .where(
        and(
          eq(contentVersions.entryId, entry.id),
          eq(contentVersions.locale, input.locale),
          eq(contentVersions.status, "PUBLISHED"),
        ),
      )
      .orderBy(desc(contentVersions.versionNumber))
      .limit(1);

    if (!version) return null;

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
          ? and(eq(contentVersions.status, "DRAFT"), eq(contentVersions.locale, locale))
          : eq(contentVersions.status, "DRAFT"),
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
