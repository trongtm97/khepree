import { describe, expect, it } from "vitest";
import { resolveReleaseNotes, sortPublicChangelog } from "./public-changelog";
import type { PublicChangelogEntry } from "./types";

describe("resolveReleaseNotes", () => {
  it("prefers requested locale then en then vi", () => {
    const notes = [
      { locale: "vi", releaseNotes: "Ghi chú VI" },
      { locale: "en", releaseNotes: "Notes EN" },
    ];
    expect(resolveReleaseNotes("vi", notes)).toBe("Ghi chú VI");
    expect(resolveReleaseNotes("en", notes)).toBe("Notes EN");
    expect(resolveReleaseNotes("ja", notes)).toBe("Notes EN");
  });
});

describe("sortPublicChangelog", () => {
  it("orders by publishedAt descending", () => {
    const base: Omit<PublicChangelogEntry, "publishedAt" | "releasePublicId" | "version"> = {
      productSlug: "app",
      productName: "App",
      platform: "windows",
      architecture: "x64",
      channel: "stable",
      releaseNotes: null,
    };
    const entries: PublicChangelogEntry[] = [
      { ...base, releasePublicId: "rel_1", version: "1.0.0", publishedAt: new Date("2026-01-01") },
      { ...base, releasePublicId: "rel_2", version: "2.0.0", publishedAt: new Date("2026-06-01") },
    ];
    expect(sortPublicChangelog(entries).map((e) => e.version)).toEqual(["2.0.0", "1.0.0"]);
  });
});
