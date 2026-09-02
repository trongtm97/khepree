import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const journalPath = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle/meta/_journal.json");

describe("migration inventory", () => {
  it("includes Phase 14–16 migrations through url redirects (0013)", () => {
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    expect(journal.entries.some((entry) => entry.tag === "0010_phase14_reliability")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0011_phase15_2_software_releases")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0012_phase15_3_cms")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0013_phase16_url_redirects")).toBe(true);
  });

  it("includes S3 storage provider migration (0014)", () => {
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    expect(journal.entries.some((entry) => entry.tag === "0014_s3_storage_provider")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0016_phase_k01_desktop_ecosystem")).toBe(true);
    expect(journal.entries.map((entry) => entry.idx)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(journal.entries.some((entry) => entry.tag === "0018_product_technical_identity")).toBe(
      true
    );
    expect(journal.entries.some((entry) => entry.tag === "0019_release_artifacts")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0020_system_announcements")).toBe(true);
  });

  it("does not rewrite historical migrations 0000–0008", () => {
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ tag: string }>;
    };
    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags.slice(0, 9)).toEqual([
      "0000_gigantic_stranger",
      "0001_friendly_lethal_legion",
      "0002_content_media_storage",
      "0003_product_catalog_phase06",
      "0004_phase065_architecture_hardening",
      "0005_phase08_license_key_hints",
      "0006_phase09_partner_platform",
      "0007_phase10_admin",
      "0008_phase13_vietnam_sepay",
    ]);
  });
});
