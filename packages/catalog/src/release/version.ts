/** Parse semver-like `major.minor.patch` with optional pre-release suffix ignored for ordering. */
export function parseReleaseVersion(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareReleaseVersions(a: string, b: string): number {
  const pa = parseReleaseVersion(a);
  const pb = parseReleaseVersion(b);
  if (!pa && !pb) return a.localeCompare(b);
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i]! !== pb[i]!) return pa[i]! - pb[i]!;
  }
  return 0;
}

export function isReleaseVersionNewer(candidate: string, current: string | null | undefined): boolean {
  if (!current?.trim()) return true;
  return compareReleaseVersions(candidate, current) > 0;
}

export function meetsMinimumVersion(version: string, minimum: string | null | undefined): boolean {
  if (!minimum?.trim()) return true;
  return compareReleaseVersions(version, minimum) >= 0;
}
