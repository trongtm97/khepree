import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../client";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("release_artifacts migration", () => {
  it("creates release_artifacts table and enum", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const tables = await db.execute<{ table_name: string }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'release_artifacts'
    `);
    expect(tables.length).toBe(1);

    const enums = await db.execute<{ typname: string }>(sql`
      SELECT typname FROM pg_type WHERE typname = 'release_artifact_kind'
    `);
    expect(enums.length).toBe(1);
  });

  it("backfills legacy software_releases as installer artifacts", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const rows = await db.execute<{ release_count: string; artifact_count: string }>(sql`
      SELECT
        (SELECT COUNT(*)::text FROM software_releases) AS release_count,
        (SELECT COUNT(*)::text FROM release_artifacts WHERE kind = 'installer') AS artifact_count
    `);
    const releaseCount = Number(rows[0]?.release_count ?? 0);
    const artifactCount = Number(rows[0]?.artifact_count ?? 0);
    expect(artifactCount).toBeGreaterThanOrEqual(releaseCount);
  });

  it("enforces singleton kind uniqueness", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const existing = await db.execute<{ release_id: string }>(sql`
      SELECT release_id::text AS release_id
      FROM release_artifacts
      WHERE kind = 'installer'
      LIMIT 1
    `);
    if (existing.length === 0) {
      // Fresh migrate without seed — nothing to duplicate against.
      return;
    }
    await expect(
      db.execute(sql`
        INSERT INTO release_artifacts (
          public_id, release_id, kind, media_asset_id, file_name, content_type, size_bytes, sha256
        )
        SELECT
          'rart_testdup1',
          ra.release_id,
          'installer',
          ra.media_asset_id,
          'duplicate-installer.exe',
          ra.content_type,
          ra.size_bytes,
          ra.sha256
        FROM release_artifacts ra
        WHERE ra.kind = 'installer'
        LIMIT 1
      `),
    ).rejects.toThrow();
  });
});
