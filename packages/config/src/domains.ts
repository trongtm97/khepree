/** Production domain map — development uses localhost ports. */
export const DOMAINS = {
  web: "khepree.com",
  account: "account.khepree.com",
  app: "app.khepree.com",
  partner: "partner.khepree.com",
  admin: "admin.khepree.com",
  api: "api.khepree.com",
  cdn: "cdn.khepree.com",
  download: "download.khepree.com",
} as const;

export type DomainKey = keyof typeof DOMAINS;

/** Local development ports per app surface. */
export const DEV_PORTS = {
  web: 3000,
  account: 3001,
  admin: 3002,
  partner: 3003,
  api: 3004,
} as const;

export type DevAppKey = keyof typeof DEV_PORTS;

export function devUrl(app: DevAppKey): string {
  return `http://localhost:${DEV_PORTS[app]}`;
}

export const BRAND = {
  name: "Khepree",
  tagline: "Software that moves you forward.",
  promise: "Useful software. Real value.",
  philosophy: "Built to create value.",
} as const;

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "vi";
export const LOCALE_COOKIE = "khepree_locale";

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? "");
}

/** Hreflang identifier: vi-VN for Vietnamese, en for English. */
export function hreflangCode(locale: SupportedLocale): string {
  return locale === "vi" ? "vi-VN" : "en";
}

export function htmlLang(locale: SupportedLocale): string {
  return locale === "vi" ? "vi" : "en";
}

/**
 * 1. explicit user preference
 * 2. valid locale cookie
 * 3. Accept-Language if it matches a supported locale
 * 4. DEFAULT_LOCALE
 *
 * Never uses IP geolocation.
 */
export function resolvePreferredLocale(input: {
  userLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): SupportedLocale {
  if (isSupportedLocale(input.userLocale)) return input.userLocale;
  if (isSupportedLocale(input.cookieLocale)) return input.cookieLocale;
  const fromHeader = localeFromAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return fromHeader;
  return DEFAULT_LOCALE;
}

export function localeFromAcceptLanguage(header: string | null | undefined): SupportedLocale | null {
  if (!header) return null;
  const tags = header.split(",").map((part) => {
    const [tag, qPart] = part.trim().split(";");
    const q = qPart?.trim().startsWith("q=") ? Number(qPart.trim().slice(2)) : 1;
    return { tag: (tag ?? "").trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
  });
  tags.sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    if (tag === "vi" || tag.startsWith("vi-")) return "vi";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return null;
}
