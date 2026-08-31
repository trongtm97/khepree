import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../client";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

/** Critical tables introduced in Phase 14–16 and K01 that must exist after migrate-from-zero. */
const CRITICAL_TABLES = [
  "outbox_events",
  "software_releases",
  "release_translations",
  "url_redirects",
  "content_categories",
  "content_category_translations",
  "desktop_clients",
  "desktop_auth_codes",
  "desktop_sessions",
] as const;

describe.skipIf(!pg)("migrations from empty database", () => {
  it("creates critical Phase 14–16 tables", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const rows = await db.execute<{ table_name: string }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const names = new Set(rows.map((row) => row.table_name));
    for (const table of CRITICAL_TABLES) {
      expect(names.has(table), `missing table ${table}`).toBe(true);
    }
  });

  it("creates outbox_status enum", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const rows = await db.execute<{ typname: string }>(sql`
      SELECT typname FROM pg_type WHERE typname = 'outbox_status'
    `);
    expect(rows.length).toBe(1);
  });
});
