import semver from "semver";
import type {
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import { parseReleaseVersion } from "../release/version";

export interface AnnouncementTargetingRow {
  productId: string | null;
  targetPlatform: ReleasePlatform | null;
  targetArchitecture: ReleaseArchitecture | null;
  releaseChannel: ReleaseChannel | null;
  minimumAppVersion: string | null;
  maximumAppVersion: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  status: string;
}

export interface DesktopAnnouncementQuery {
  productId: string | null;
  appVersion: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  now?: Date;
}

export function isWithinAnnouncementSchedule(
  row: Pick<AnnouncementTargetingRow, "startsAt" | "expiresAt">,
  now: Date,
): boolean {
  if (row.startsAt && row.startsAt.getTime() > now.getTime()) return false;
  if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function matchesAppVersionRange(
  appVersion: string,
  minimum: string | null,
  maximum: string | null,
): boolean {
  const current = parseReleaseVersion(appVersion);
  if (!current) return false;
  if (minimum?.trim()) {
    const floor = parseReleaseVersion(minimum);
    if (!floor || semver.lt(current, floor)) return false;
  }
  if (maximum?.trim()) {
    const ceiling = parseReleaseVersion(maximum);
    if (!ceiling || semver.gt(current, ceiling)) return false;
  }
  return true;
}

export function matchesAnnouncementTargeting(
  row: AnnouncementTargetingRow,
  query: DesktopAnnouncementQuery,
): boolean {
  if (row.status !== "published") return false;

  const now = query.now ?? new Date();
  if (!isWithinAnnouncementSchedule(row, now)) return false;

  if (row.productId && row.productId !== query.productId) return false;
  if (row.targetPlatform && row.targetPlatform !== query.platform) return false;
  if (
    row.targetArchitecture &&
    row.targetArchitecture !== query.architecture &&
    row.targetArchitecture !== "universal"
  ) {
    return false;
  }
  if (row.releaseChannel && row.releaseChannel !== query.channel) return false;

  return matchesAppVersionRange(query.appVersion, row.minimumAppVersion, row.maximumAppVersion);
}

export function assertValidAnnouncementSchedule(startsAt: Date | null, expiresAt: Date | null): void {
  if (startsAt && expiresAt && startsAt.getTime() >= expiresAt.getTime()) {
    throw new Error("startsAt must be before expiresAt");
  }
}

export function assertValidAppVersionRange(minimum: string | null, maximum: string | null): void {
  if (!minimum?.trim() || !maximum?.trim()) return;
  const floor = parseReleaseVersion(minimum);
  const ceiling = parseReleaseVersion(maximum);
  if (floor && ceiling && semver.gt(floor, ceiling)) {
    throw new Error("minimumAppVersion must be less than or equal to maximumAppVersion");
  }
}

export function normalizeAppVersionField(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = parseReleaseVersion(value);
  if (!parsed) throw new Error("App version must be valid SemVer");
  return parsed;
}
