import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { contentEntries, contentVersions, getDb } from "@khepree/db";
import { createContentService } from "./service";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("CMS draft version allocation (Postgres)", () => {
  it("retries unique (entry, locale, version) under concurrent creates", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const service = createContentService(db);
    const slug = `cms-race-${crypto.randomUUID()}`;
    const first = await service.createDraft({
      slug,
      contentType: "article",
      locale: "vi",
      title: "Root",
    });

    const created = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        service.createDraftVersion({
          entryId: first.entryId,
          locale: "vi",
          title: `Draft ${i}`,
        }),
      ),
    );

    const numbers = created.map((row) => row.versionNumber).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(4);

    await db.delete(contentVersions).where(eq(contentVersions.entryId, first.entryId));
    await db.delete(contentEntries).where(eq(contentEntries.id, first.entryId));
  });
});
