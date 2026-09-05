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

  it("defaults type to general when not provided", () => {
    const parsed = parseAnnouncementDraftForm({ titleVi: "T", ctaKind: "none" });
    expect(parsed.type).toBe("general");
  });

  it("parses whats_new type", () => {
    const parsed = parseAnnouncementDraftForm({ titleVi: "T", ctaKind: "none", type: "whats_new" });
    expect(parsed.type).toBe("whats_new");
  });

  it("parses urgent type", () => {
    const parsed = parseAnnouncementDraftForm({ titleVi: "T", ctaKind: "none", type: "urgent" });
    expect(parsed.type).toBe("urgent");
  });

  it("falls back to general for unknown type", () => {
    const parsed = parseAnnouncementDraftForm({ titleVi: "T", ctaKind: "none", type: "flying_saucer" });
    expect(parsed.type).toBe("general");
  });

  it("parses ctaLabel per locale", () => {
    const parsed = parseAnnouncementDraftForm({
      titleVi: "Tiêu đề VI",
      titleEn: "Title EN",
      ctaKind: "none",
      ctaLabelVi: "Khám phá tính năng mới",
      ctaLabelEn: "Explore what's new",
    });
    const vi = parsed.translations.find((t) => t.locale === "vi");
    const en = parsed.translations.find((t) => t.locale === "en");
    expect(vi?.ctaLabel).toBe("Khám phá tính năng mới");
    expect(en?.ctaLabel).toBe("Explore what's new");
  });

  it("parses software_update CTA with release public id", () => {
    const parsed = parseAnnouncementDraftForm({
      titleVi: "Có bản mới",
      ctaKind: "software_update",
      ctaReleasePublicId: "rel_abcdefghijkl",
      type: "whats_new",
    });
    expect(parsed.ctaKind).toBe("software_update");
    expect(parsed.ctaPayload).toEqual({
      releasePublicId: "rel_abcdefghijkl",
      actions: ["download", "auto_update"],
    });
    expect(parsed.type).toBe("whats_new");
  });
});
