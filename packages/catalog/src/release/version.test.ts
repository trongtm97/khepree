import { describe, expect, it } from "vitest";
import {
  compareReleaseVersions,
  isReleaseVersionNewer,
  matchesReleaseChannelPolicy,
  meetsMinimumVersion,
  parseReleaseVersion,
  pickLatestCompatibleRelease,
  pickLatestPublishedRelease,
  type LatestReleaseCandidate,
} from "./version";

describe("parseReleaseVersion", () => {
  it("accepts canonical semver and optional v prefix", () => {
    expect(parseReleaseVersion("1.2.3")).toBe("1.2.3");
    expect(parseReleaseVersion("v1.2.3")).toBe("1.2.3");
    expect(parseReleaseVersion("  1.2.3-beta.1  ")).toBe("1.2.3-beta.1");
  });

  it("rejects invalid versions", () => {
    expect(parseReleaseVersion("1.2.3abc")).toBeNull();
    expect(parseReleaseVersion("1.2.3.4")).toBeNull();
    expect(parseReleaseVersion("")).toBeNull();
  });
});

describe("compareReleaseVersions", () => {
  it("orders versions with semver rules", () => {
    expect(compareReleaseVersions("1.2.4", "1.2.3")).toBeGreaterThan(0);
    expect(compareReleaseVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareReleaseVersions("1.2.3-beta.1", "1.2.3")).toBeLessThan(0);
  });
});

describe("isReleaseVersionNewer", () => {
  it("rejects same or older", () => {
    expect(isReleaseVersionNewer("1.0.0", "1.0.0")).toBe(false);
    expect(isReleaseVersionNewer("1.0.0", "2.0.0")).toBe(false);
    expect(isReleaseVersionNewer("1.0.1", "1.0.0")).toBe(true);
  });
});

describe("meetsMinimumVersion", () => {
  it("checks client floor against minimum supported version", () => {
    expect(meetsMinimumVersion("1.2.0", "1.1.0")).toBe(true);
    expect(meetsMinimumVersion("1.1.0", "1.1.0")).toBe(true);
    expect(meetsMinimumVersion("1.0.0", "1.1.0")).toBe(false);
  });
});

describe("matchesReleaseChannelPolicy", () => {
  it("stable excludes prerelease versions", () => {
    expect(matchesReleaseChannelPolicy("1.2.3", "stable")).toBe(true);
    expect(matchesReleaseChannelPolicy("1.2.3-beta.1", "stable")).toBe(false);
    expect(matchesReleaseChannelPolicy("1.2.3-beta.1", "beta")).toBe(true);
  });
});

describe("pickLatestCompatibleRelease", () => {
  const base = {
    platform: "windows",
    architecture: "x64" as const,
    channel: "stable" as const,
    minimumSupportedVersion: null,
  };

  function row(
    overrides: Partial<LatestReleaseCandidate> & Pick<LatestReleaseCandidate, "publicId" | "version">,
  ): LatestReleaseCandidate {
    return { ...base, ...overrides };
  }

  it("returns null when client is below minimum supported version", () => {
    const picked = pickLatestCompatibleRelease(
      [row({ publicId: "rel-1", version: "2.0.0", minimumSupportedVersion: "2.0.0" })],
      { platform: "windows", architecture: "x64", channel: "stable", currentVersion: "1.9.0" },
    );
    expect(picked).toBeNull();
  });

  it("returns release when client meets minimum supported version", () => {
    const picked = pickLatestCompatibleRelease(
      [row({ publicId: "rel-1", version: "2.1.0", minimumSupportedVersion: "2.0.0" })],
      { platform: "windows", architecture: "x64", channel: "stable", currentVersion: "2.0.0" },
    );
    expect(picked?.publicId).toBe("rel-1");
  });

  it("stable channel does not pick beta prereleases", () => {
    const picked = pickLatestCompatibleRelease(
      [
        row({ publicId: "rel-beta", version: "9.0.0-beta.1", channel: "stable" }),
        row({ publicId: "rel-stable", version: "2.0.0", channel: "stable" }),
      ],
      { platform: "windows", architecture: "x64", channel: "stable", currentVersion: "1.0.0" },
    );
    expect(picked?.publicId).toBe("rel-stable");
  });

  it("selects by platform, architecture, and channel", () => {
    const rows = [
      row({ publicId: "rel-win", version: "2.0.0", platform: "windows" }),
      row({ publicId: "rel-mac", version: "3.0.0", platform: "macos" }),
      row({ publicId: "rel-arm", version: "4.0.0", architecture: "arm64" }),
      row({ publicId: "rel-universal", version: "5.0.0", architecture: "universal" }),
      row({ publicId: "rel-beta", version: "6.0.0", channel: "beta" }),
    ];

    expect(
      pickLatestCompatibleRelease(rows, {
        platform: "windows",
        architecture: "x64",
        channel: "stable",
        currentVersion: "1.0.0",
      })?.publicId,
    ).toBe("rel-universal");

    expect(
      pickLatestCompatibleRelease(rows, {
        platform: "windows",
        architecture: "arm64",
        channel: "stable",
        currentVersion: "1.0.0",
      })?.publicId,
    ).toBe("rel-universal");

    expect(
      pickLatestCompatibleRelease([row({ publicId: "rel-arm", version: "4.0.0", architecture: "arm64" })], {
        platform: "windows",
        architecture: "arm64",
        channel: "stable",
        currentVersion: "1.0.0",
      })?.publicId,
    ).toBe("rel-arm");

    expect(
      pickLatestCompatibleRelease(rows, {
        platform: "windows",
        architecture: "x64",
        channel: "beta",
        currentVersion: "1.0.0",
      })?.publicId,
    ).toBe("rel-beta");
  });

  it("pickLatestPublishedRelease returns latest without installed-version filter", () => {
    const rows = [
      row({ publicId: "rel-old", version: "1.0.0", platform: "windows" }),
      row({ publicId: "rel-new", version: "2.0.0", platform: "windows" }),
      row({ publicId: "rel-mac", version: "9.0.0", platform: "macos" }),
    ];
    expect(
      pickLatestPublishedRelease(rows, {
        platform: "windows",
        architecture: "x64",
        channel: "stable",
      })?.publicId,
    ).toBe("rel-new");
  });
});
