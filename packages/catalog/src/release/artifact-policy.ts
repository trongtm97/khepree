import type { ReleaseArtifactKind, ReleasePlatform } from "@khepree/db";

/** Windows Squirrel auto-update feed requires these artifact kinds before publish. */
export const WINDOWS_SQUIRREL_REQUIRED_KINDS = [
  "full-nupkg",
  "releases-index",
  "installer",
] as const satisfies readonly ReleaseArtifactKind[];

/** Non-Windows platforms still require a primary installer artifact. */
export const DEFAULT_REQUIRED_KINDS = ["installer"] as const satisfies readonly ReleaseArtifactKind[];

export function requiredArtifactKinds(platform: ReleasePlatform): readonly ReleaseArtifactKind[] {
  if (platform === "windows") return WINDOWS_SQUIRREL_REQUIRED_KINDS;
  return DEFAULT_REQUIRED_KINDS;
}

export function hasRequiredArtifacts(
  platform: ReleasePlatform,
  kinds: Iterable<ReleaseArtifactKind>,
): boolean {
  const present = new Set(kinds);
  return requiredArtifactKinds(platform).every((kind) => present.has(kind));
}

export function assertPublishableArtifacts(
  platform: ReleasePlatform,
  kinds: Iterable<ReleaseArtifactKind>,
): void {
  const present = new Set(kinds);
  const missing = requiredArtifactKinds(platform).filter((kind) => !present.has(kind));
  if (missing.length === 0) return;
  throw new Error(`Missing required release artifacts for ${platform}: ${missing.join(", ")}`);
}

/** Media must belong to the release product or already be bound to this release. */
export function mediaContextMatchesRelease(input: {
  productId: string;
  releasePublicId: string;
  mediaContext: string | null | undefined;
}): boolean {
  const context = input.mediaContext?.trim();
  if (!context) return false;
  if (context === `release:${input.releasePublicId}`) return true;
  if (context === `product:${input.productId}`) return true;
  return false;
}
