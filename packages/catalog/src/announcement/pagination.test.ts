import { describe, expect, it } from "vitest";
import {
  decodeAnnouncementCursor,
  encodeAnnouncementCursor,
  isAnnouncementAfterCursor,
  paginateAnnouncements,
  sortAnnouncementsForDesktop,
} from "./pagination";

function row(id: string, publishedAt: string) {
  return { id, publishedAt: new Date(publishedAt) };
}

describe("paginateAnnouncements", () => {
  const rows = [
    row("c", "2026-09-03T12:00:00.000Z"),
    row("b", "2026-09-03T12:00:00.000Z"),
    row("a", "2026-09-02T12:00:00.000Z"),
  ];

  it("orders by publishedAt desc then id desc", () => {
    expect(sortAnnouncementsForDesktop(rows).map((entry) => entry.id)).toEqual(["c", "b", "a"]);
  });

  it("pages without overlap or gaps", () => {
    const first = paginateAnnouncements(rows, { limit: 2, cursor: null });
    expect(first.items.map((entry) => entry.id)).toEqual(["c", "b"]);
    expect(first.nextCursor).toBeTruthy();

    const second = paginateAnnouncements(rows, {
      limit: 2,
      cursor: decodeAnnouncementCursor(first.nextCursor),
    });
    expect(second.items.map((entry) => entry.id)).toEqual(["a"]);
    expect(second.nextCursor).toBeNull();

    const ids = [...first.items, ...second.items].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("cursor comparison is stable for equal publishedAt", () => {
    expect(
      isAnnouncementAfterCursor(row("a", "2026-09-03T12:00:00.000Z"), {
        publishedAt: "2026-09-03T12:00:00.000Z",
        id: "c",
      }),
    ).toBe(true);
    expect(
      isAnnouncementAfterCursor(row("d", "2026-09-03T12:00:00.000Z"), {
        publishedAt: "2026-09-03T12:00:00.000Z",
        id: "b",
      }),
    ).toBe(false);
  });

  it("rejects malformed cursor", () => {
    expect(decodeAnnouncementCursor("not-valid")).toBeNull();
    expect(encodeAnnouncementCursor({ publishedAt: "2026-01-01T00:00:00.000Z", id: "x" })).toBeTruthy();
  });
});
