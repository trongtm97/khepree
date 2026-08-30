import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, resolvePreferredLocale, localeFromAcceptLanguage } from "./domains";
import { getEnv } from "./env";

describe("locale defaults", () => {
  it("defaults to Vietnamese first", () => {
    expect(DEFAULT_LOCALE).toBe("vi");
  });

  it("prefers user locale, then cookie, then Accept-Language, then default", () => {
    expect(
      resolvePreferredLocale({
        userLocale: "en",
        cookieLocale: "vi",
        acceptLanguage: "vi-VN,vi;q=0.9",
      }),
    ).toBe("en");
    expect(
      resolvePreferredLocale({
        cookieLocale: "en",
        acceptLanguage: "vi",
      }),
    ).toBe("en");
    expect(resolvePreferredLocale({ acceptLanguage: "en-US,en;q=0.8,vi;q=0.7" })).toBe("en");
    expect(resolvePreferredLocale({ acceptLanguage: "fr-FR" })).toBe("vi");
    expect(resolvePreferredLocale({})).toBe("vi");
  });

  it("parses Accept-Language quality values", () => {
    expect(localeFromAcceptLanguage("en;q=0.8,vi-VN;q=0.9")).toBe("vi");
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });

  it("maps hreflang codes for Vietnam-first SEO", async () => {
    const { hreflangCode } = await import("./domains");
    expect(hreflangCode("vi")).toBe("vi-VN");
    expect(hreflangCode("en")).toBe("en");
  });
});

describe("currency default", () => {
  it("defaults to VND", async () => {
    const { DEFAULT_CURRENCY } = await import("./env");
    expect(DEFAULT_CURRENCY).toBe("VND");
  });

  it("accepts sepay as a payment provider", () => {
    const env = getEnv({ PAYMENT_PROVIDER: "sepay", SEPAY_ENV: "sandbox" });
    expect(env.PAYMENT_PROVIDER).toBe("sepay");
    expect(env.SEPAY_ENV).toBe("sandbox");
  });
});
