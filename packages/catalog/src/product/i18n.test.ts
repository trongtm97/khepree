import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE } from "@khepree/config";
import { resolveLocalizedRow } from "./i18n";

describe("resolveLocalizedRow", () => {
  const rows = [
    { locale: "en", title: "English" },
    { locale: "vi", title: "Tiếng Việt" },
  ];

  it("uses DEFAULT_LOCALE as the centralized fallback", () => {
    expect(DEFAULT_LOCALE).toBe("vi");
    expect(resolveLocalizedRow(rows, "fr")?.title).toBe("Tiếng Việt");
  });

  it("prefers the requested locale when present", () => {
    expect(resolveLocalizedRow(rows, "en")?.title).toBe("English");
  });

  it("does not mix fields from different locales", () => {
    const mixed = [
      { locale: "en", title: "English", description: "EN body" },
      { locale: "vi", title: "Tiếng Việt", description: "VI body" },
    ];
    const row = resolveLocalizedRow(mixed, "vi");
    expect(row).toEqual({ locale: "vi", title: "Tiếng Việt", description: "VI body" });
  });
});
