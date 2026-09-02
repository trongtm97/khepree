export interface AnnouncementPageCursor {
  publishedAt: string;
  id: string;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export function clampAnnouncementLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || !value) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

export function encodeAnnouncementCursor(cursor: AnnouncementPageCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeAnnouncementCursor(value: string | null | undefined): AnnouncementPageCursor | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value.trim(), "base64url").toString("utf8")) as {
      publishedAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.publishedAt !== "string" || typeof parsed.id !== "string") return null;
    if (Number.isNaN(Date.parse(parsed.publishedAt))) return null;
    return { publishedAt: parsed.publishedAt, id: parsed.id };
  } catch {
    return null;
  }
}

export function sortAnnouncementsForDesktop<
  T extends { id: string; publishedAt: Date | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const timeDelta = (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    if (timeDelta !== 0) return timeDelta;
    return b.id.localeCompare(a.id);
  });
}

/** True when `row` appears after `cursor` in the publishedAt desc + id desc feed. */
export function isAnnouncementAfterCursor(
  row: { id: string; publishedAt: Date | null },
  cursor: AnnouncementPageCursor,
): boolean {
  const rowTime = row.publishedAt?.getTime() ?? 0;
  const cursorTime = Date.parse(cursor.publishedAt);
  if (rowTime < cursorTime) return true;
  if (rowTime > cursorTime) return false;
  return row.id < cursor.id;
}

export function paginateAnnouncements<T extends { id: string; publishedAt: Date | null }>(
  rows: T[],
  options: { limit: number; cursor: AnnouncementPageCursor | null },
): { items: T[]; nextCursor: string | null } {
  const sorted = sortAnnouncementsForDesktop(rows);
  const filtered = options.cursor
    ? sorted.filter((row) => isAnnouncementAfterCursor(row, options.cursor!))
    : sorted;
  const slice = filtered.slice(0, options.limit + 1);
  const hasMore = slice.length > options.limit;
  const items = hasMore ? slice.slice(0, options.limit) : slice;
  const last = items.at(-1);
  const nextCursor =
    hasMore && last?.publishedAt
      ? encodeAnnouncementCursor({ publishedAt: last.publishedAt.toISOString(), id: last.id })
      : null;
  return { items, nextCursor };
}

export { DEFAULT_LIMIT as ANNOUNCEMENT_DEFAULT_LIMIT, MAX_LIMIT as ANNOUNCEMENT_MAX_LIMIT };
