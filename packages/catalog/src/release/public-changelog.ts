import type { PublicChangelogEntry } from "./types";

export function resolveReleaseNotes(
  locale: string,
  notes: Array<{ locale: string; releaseNotes: string | null }>,
): string | null {
  const pick = (code: string) => notes.find((n) => n.locale === code)?.releaseNotes?.trim();
  return pick(locale) || pick("en") || pick("vi") || null;
}

/** Latest published first — tie-break by version when timestamps match. */
export function sortPublicChangelog(entries: PublicChangelogEntry[]): PublicChangelogEntry[] {
  return [...entries].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
