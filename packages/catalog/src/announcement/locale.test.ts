import { describe, expect, it } from "vitest";
import { hasDefaultLocaleTranslation, resolveAnnouncementCopy } from "./locale";

describe("resolveAnnouncementCopy", () => {
  const translations = [
    { locale: "vi", title: "Tiêu đề VI", body: "Nội dung VI" },
    { locale: "en", title: "Title EN", body: "Body EN" },
  ];

  it("falls back vi then en", () => {
    expect(resolveAnnouncementCopy("vi", translations)?.title).toBe("Tiêu đề VI");
    expect(resolveAnnouncementCopy("fr", translations)?.title).toBe("Tiêu đề VI");
    expect(
      resolveAnnouncementCopy("fr", [{ locale: "en", title: "Only EN", body: null }])?.title,
    ).toBe("Only EN");
  });
});

describe("hasDefaultLocaleTranslation", () => {
  it("requires vi title for publish gate", () => {
    expect(hasDefaultLocaleTranslation([{ locale: "vi", title: "OK", body: null }])).toBe(true);
    expect(hasDefaultLocaleTranslation([{ locale: "en", title: "EN only", body: null }])).toBe(
      false,
    );
  });
});
