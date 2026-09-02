import { describe, expect, it } from "vitest";
import {
  assertValidAnnouncementSchedule,
  assertValidAppVersionRange,
  isWithinAnnouncementSchedule,
  matchesAnnouncementTargeting,
  matchesAppVersionRange,
} from "./targeting";

const PRODUCT_A = "11111111-1111-4111-8111-111111111111";
const PRODUCT_B = "22222222-2222-4222-8222-222222222222";

const baseRow = {
  productId: null as string | null,
  targetPlatform: null as "windows" | null,
  targetArchitecture: null as "x64" | null,
  releaseChannel: null as "stable" | null,
  minimumAppVersion: null as string | null,
  maximumAppVersion: null as string | null,
  startsAt: null as Date | null,
  expiresAt: null as Date | null,
  status: "published" as const,
};

const baseQuery = {
  productId: PRODUCT_A,
  appVersion: "2.0.0",
  platform: "windows" as const,
  architecture: "x64" as const,
  channel: "stable" as const,
};

describe("matchesAnnouncementTargeting", () => {
  it("filters by product, platform, architecture, channel and semver range", () => {
    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, productId: PRODUCT_B },
        baseQuery,
      ),
    ).toBe(false);

    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, targetPlatform: "macos" },
        baseQuery,
      ),
    ).toBe(false);

    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, targetArchitecture: "arm64" },
        baseQuery,
      ),
    ).toBe(false);

    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, targetArchitecture: "universal" },
        baseQuery,
      ),
    ).toBe(true);

    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, releaseChannel: "beta" },
        baseQuery,
      ),
    ).toBe(false);

    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, minimumAppVersion: "2.1.0" },
        baseQuery,
      ),
    ).toBe(false);

    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, maximumAppVersion: "1.9.0" },
        baseQuery,
      ),
    ).toBe(false);
  });

  it("excludes non-published announcements", () => {
    expect(matchesAnnouncementTargeting({ ...baseRow, status: "draft" }, baseQuery)).toBe(false);
    expect(matchesAnnouncementTargeting({ ...baseRow, status: "expired" }, baseQuery)).toBe(false);
  });

  it("respects startsAt and expiresAt", () => {
    const now = new Date("2026-09-03T10:00:00.000Z");
    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, startsAt: new Date("2026-09-03T11:00:00.000Z") },
        { ...baseQuery, now },
      ),
    ).toBe(false);
    expect(
      matchesAnnouncementTargeting(
        { ...baseRow, expiresAt: new Date("2026-09-03T09:00:00.000Z") },
        { ...baseQuery, now },
      ),
    ).toBe(false);
    expect(isWithinAnnouncementSchedule({ startsAt: null, expiresAt: null }, now)).toBe(true);
  });
});

describe("matchesAppVersionRange", () => {
  it("uses semver comparisons", () => {
    expect(matchesAppVersionRange("2.0.0", "1.9.0", "2.1.0")).toBe(true);
    expect(matchesAppVersionRange("2.2.0", null, "2.1.0")).toBe(false);
    expect(matchesAppVersionRange("1.0.0", "1.1.0", null)).toBe(false);
  });
});

describe("assertValidAnnouncementSchedule", () => {
  it("rejects startsAt after expiresAt", () => {
    expect(() =>
      assertValidAnnouncementSchedule(
        new Date("2026-09-04T00:00:00.000Z"),
        new Date("2026-09-03T00:00:00.000Z"),
      ),
    ).toThrow(/startsAt/);
  });
});

describe("assertValidAppVersionRange", () => {
  it("rejects minimum above maximum", () => {
    expect(() => assertValidAppVersionRange("2.1.0", "2.0.0")).toThrow(/minimumAppVersion/);
  });
});
