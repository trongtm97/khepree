export function assertPublishableReleaseNotes(
  notes: Array<{ locale: string; releaseNotes: string | null }>,
): void {
  const vi = notes.find((row) => row.locale === "vi")?.releaseNotes?.trim();
  if (!vi) {
    throw new Error("Thiếu ghi chú phát hành tiếng Việt (vi)");
  }
}
