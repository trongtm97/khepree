import { DOMAINS } from "@khepree/config";
import type { Metadata } from "next";
import type { SupportedLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? `https://${DOMAINS.web}`;

export interface PageSeoInput {
  locale: SupportedLocale;
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
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
}: PageSeoInput): Metadata {
  const canonicalPath = localePath(locale, path);
  const url = siteUrl(canonicalPath);
  const fullTitle = title.includes("Khepree") ? title : `${title} | Khepree`;

  const locales: readonly SupportedLocale[] = hreflangLocales ?? ["en", "vi"];
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = siteUrl(localePath(loc, path));
  }
  const defaultLocale: SupportedLocale = locales.some((item) => item === "en")
    ? "en"
    : (locales[0] ?? locale);
  languages["x-default"] = siteUrl(localePath(defaultLocale, path));

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
      alternateLocale: locale === "vi" ? ["en_US"] : ["vi_VN"],
      url,
      siteName: "Khepree",
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export { SITE_URL };
