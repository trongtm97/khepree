import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const journalPath = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle/meta/_journal.json");

describe("migration inventory", () => {
  it("includes Phase 14 reliability (0010), Phase 15.2 releases (0011), Phase 15.3 CMS (0012)", () => {
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    expect(journal.entries.some((entry) => entry.tag === "0010_phase14_reliability")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0011_phase15_2_software_releases")).toBe(true);
    expect(journal.entries.some((entry) => entry.tag === "0012_phase15_3_cms")).toBe(true);
    expect(journal.entries.map((entry) => entry.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
