import { DEFAULT_LOCALE, hreflangCode, marketingPublicUrl, type SupportedLocale } from "@khepree/config";
import type { Metadata } from "next";
import { localePath } from "@/lib/i18n/config";

const SITE_URL = marketingPublicUrl();

export interface PageSeoInput {
  locale: SupportedLocale;
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  image?: string;
  /** When omitted, both en and vi are advertised. Pass only locales that actually resolve. */
  hreflangLocales?: readonly SupportedLocale[];
}

export function siteUrl(path = ""): string {
  const base = SITE_URL.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata({
  locale,
  title,
  description,
  path,
  noIndex = false,
  hreflangLocales,
  image,
}: PageSeoInput): Metadata {
  const canonicalPath = localePath(locale, path);
  const url = siteUrl(canonicalPath);
  const fullTitle = title.includes("Khepree") ? title : `${title} | Khepree`;

  const locales: readonly SupportedLocale[] = hreflangLocales ?? ["vi", "en"];
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[hreflangCode(loc)] = siteUrl(localePath(loc, path));
  }
  const defaultLocale: SupportedLocale = locales.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : (locales[0] ?? locale);
  languages["x-default"] = siteUrl(localePath(defaultLocale, path));

  const alternateLocale = locales
    .filter((loc) => loc !== locale)
    .map((loc) => (loc === "vi" ? "vi_VN" : "en_US"));

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale === "vi" ? "vi_VN" : "en_US",
      alternateLocale,
      url,
      siteName: "Khepree",
      title: fullTitle,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export { SITE_URL };
