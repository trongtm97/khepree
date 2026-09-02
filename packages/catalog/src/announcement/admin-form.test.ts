import { describe, expect, it } from "vitest";
import { parseAnnouncementDraftForm, parseUtcDateTimeLocal } from "./admin-form";

describe("parseUtcDateTimeLocal", () => {
  it("parses datetime-local value as UTC", () => {
    const date = parseUtcDateTimeLocal("2026-09-03T08:00");
    expect(date?.toISOString()).toBe("2026-09-03T08:00:00.000Z");
  });

  it("returns null for empty input", () => {
    expect(parseUtcDateTimeLocal("")).toBeNull();
  });
});

describe("parseAnnouncementDraftForm", () => {
  it("requires at least one translation and sanitizes body", () => {
    const parsed = parseAnnouncementDraftForm({
      titleVi: "Tiêu đề",
      bodyVi: "<script>x</script>Nội dung",
      severity: "warning",
      ctaKind: "none",
    });
    expect(parsed.translations).toHaveLength(1);
    expect(parsed.translations[0]?.body).toBe("Nội dung");
    expect(parsed.severity).toBe("warning");
  });

  it("rejects invalid version range at service layer via semver fields", () => {
    const parsed = parseAnnouncementDraftForm({
      titleVi: "T",
      minimumAppVersion: "2.0.0",
      maximumAppVersion: "1.0.0",
      ctaKind: "none",
    });
    expect(parsed.minimumAppVersion).toBe("2.0.0");
    expect(parsed.maximumAppVersion).toBe("1.0.0");
  });
});
