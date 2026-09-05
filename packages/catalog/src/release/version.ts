import semver from "semver";
import type { ReleaseArchitecture, ReleaseChannel } from "@khepree/db";

/** Canonical SemVer (no leading `v`). Accepts optional `v` prefix on input. */
export function parseReleaseVersion(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return semver.valid(trimmed);
}

export function compareReleaseVersions(a: string, b: string): number {
  const va = parseReleaseVersion(a);
  const vb = parseReleaseVersion(b);
  if (!va && !vb) return a.localeCompare(b);
  if (!va) return -1;
  if (!vb) return 1;
  return semver.compare(va, vb);
}

export function isReleaseVersionNewer(candidate: string, current: string): boolean {
  const next = parseReleaseVersion(candidate);
  const installed = parseReleaseVersion(current);
  if (!next || !installed) return false;
  return semver.gt(next, installed);
}

/** True when the installed client version satisfies the release minimum floor. */
export function meetsMinimumVersion(
  clientVersion: string,
  minimum: string | null | undefined,
): boolean {
  if (!minimum?.trim()) return true;
  const floor = parseReleaseVersion(minimum);
  const installed = parseReleaseVersion(clientVersion);
  if (!floor || !installed) return false;
  return semver.gte(installed, floor);
}

export function isStableReleaseVersion(version: string): boolean {
  const parsed = parseReleaseVersion(version);
  if (!parsed) return false;
  return semver.prerelease(parsed) === null;
}

/** Stable channel excludes semver prereleases; beta/alpha follow DB channel only. */
export function matchesReleaseChannelPolicy(version: string, channel: ReleaseChannel): boolean {
  if (channel !== "stable") return parseReleaseVersion(version) !== null;
  return isStableReleaseVersion(version);
}

export interface LatestReleaseCandidate {
  publicId: string;
  version: string;
  platform: string;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  minimumSupportedVersion: string | null;
}

export function pickLatestCompatibleRelease<T extends LatestReleaseCandidate>(
  rows: T[],
  query: {
    platform: string;
    architecture: ReleaseArchitecture;
    channel: ReleaseChannel;
    currentVersion: string;
  },
): T | null {
  const current = parseReleaseVersion(query.currentVersion);
  if (!current) return null;

  const archMatch = rows.filter(
    (row) =>
      row.platform === query.platform &&
      (row.architecture === query.architecture || row.architecture === "universal"),
  );

  const eligible = archMatch.filter((row) => {
    if (row.channel !== query.channel) return false;
    if (!matchesReleaseChannelPolicy(row.version, query.channel)) return false;
    if (!isReleaseVersionNewer(row.version, current)) return false;
    return meetsMinimumVersion(current, row.minimumSupportedVersion);
  });

  if (eligible.length === 0) return null;

  return eligible.sort((a, b) => compareReleaseVersions(b.version, a.version))[0] ?? null;
}

/** Latest published row for a feed channel — no installed-version filter (Squirrel compares client-side). */
export function pickLatestPublishedRelease<T extends LatestReleaseCandidate>(
  rows: T[],
  query: {
    platform: string;
    architecture: ReleaseArchitecture;
    channel: ReleaseChannel;
  },
): T | null {
  const eligible = rows.filter((row) => {
    if (row.platform !== query.platform) return false;
    if (row.architecture !== query.architecture && row.architecture !== "universal") return false;
    if (row.channel !== query.channel) return false;
    return matchesReleaseChannelPolicy(row.version, query.channel);
  });
  if (eligible.length === 0) return null;
  return eligible.sort((a, b) => compareReleaseVersions(b.version, a.version))[0] ?? null;
}

/**
 * Inclusive SemVer ceiling for targeting clients older than `version`.
 * Used when auto-notifying a release so apps already on that version skip the banner.
 */
export function versionCeilingBelow(version: string): string | null {
  const parsed = parseReleaseVersion(version);
  if (!parsed) return null;
  const v = semver.parse(parsed);
  if (!v) return null;
  if (v.patch > 0) return `${v.major}.${v.minor}.${v.patch - 1}`;
  if (v.minor > 0) return `${v.major}.${v.minor - 1}.9999`;
  if (v.major > 0) return `${v.major - 1}.9999.9999`;
  return null;
}
