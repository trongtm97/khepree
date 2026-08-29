import { describe, expect, it } from "vitest";
import { bodyObjectKeyFor, nextContentVersionNumber } from "./service";

describe("nextContentVersionNumber", () => {
  it("starts at 1 when no prior versions exist", () => {
    expect(nextContentVersionNumber(null)).toBe(1);
    expect(nextContentVersionNumber(undefined)).toBe(1);
  });

  it("increments from the current max version", () => {
    expect(nextContentVersionNumber(1)).toBe(2);
    expect(nextContentVersionNumber(5)).toBe(6);
  });
});

describe("bodyObjectKeyFor", () => {
  it("builds immutable version-scoped private keys", () => {
    const entryId = "entry-uuid";
    const locale = "en";

    expect(bodyObjectKeyFor(entryId, locale, 1)).toBe(
      "prv/content/entry-uuid/en/v1.md",
    );
    expect(bodyObjectKeyFor(entryId, locale, 2)).toBe(
      "prv/content/entry-uuid/en/v2.md",
    );
    expect(bodyObjectKeyFor(entryId, locale, 1)).not.toBe(
      bodyObjectKeyFor(entryId, locale, 2),
    );
  });
});
