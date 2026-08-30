import { describe, expect, it } from "vitest";
import {
  compareReleaseVersions,
  isReleaseVersionNewer,
  meetsMinimumVersion,
  parseReleaseVersion,
} from "./version";

describe("parseReleaseVersion", () => {
  it("parses semver prefix", () => {
    expect(parseReleaseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseReleaseVersion("1.2.3-beta")).toEqual([1, 2, 3]);
  });
});

describe("compareReleaseVersions", () => {
  it("orders versions", () => {
    expect(compareReleaseVersions("1.0.1", "1.0.0")).toBeGreaterThan(0);
    expect(compareReleaseVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
  });
});

describe("isReleaseVersionNewer", () => {
  it("treats empty current as always newer", () => {
    expect(isReleaseVersionNewer("1.0.0", null)).toBe(true);
  });

  it("rejects same or older", () => {
    expect(isReleaseVersionNewer("1.0.0", "1.0.0")).toBe(false);
    expect(isReleaseVersionNewer("1.0.0", "2.0.0")).toBe(false);
  });
});

describe("meetsMinimumVersion", () => {
  it("checks floor", () => {
    expect(meetsMinimumVersion("1.2.0", "1.1.0")).toBe(true);
    expect(meetsMinimumVersion("1.0.0", "1.1.0")).toBe(false);
  });
});
