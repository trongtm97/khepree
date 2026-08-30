import { DEFAULT_LOCALE, SUPPORTED_LOCALES, hreflangCode } from "@khepree/config";
import type { MetadataRoute } from "next";
import { AUDIENCE_SLUGS } from "@/lib/audiences";
import { listPublishedContent } from "@/lib/content";
import { getPublicProducts } from "@/lib/catalog";
import { localePath } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo/metadata";

const ROUTES = [
  "",
  "/products",
  "/solutions",
  ...AUDIENCE_SLUGS.map((slug) => `/solutions/${slug}`),
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  "/docs",
  "/security",
  "/privacy",
  "/terms",
] as const;

function localeAlternates(path: string): MetadataRoute.Sitemap[number]["alternates"] {
  const languages: Record<string, string> = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [hreflangCode(locale), siteUrl(localePath(locale, path || "/"))]),
  );
  languages["x-default"] = siteUrl(localePath(DEFAULT_LOCALE, path || "/"));
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
    ROUTES.map((route) => ({
      url: siteUrl(localePath(locale, route || "/")),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.7,
      alternates: localeAlternates(route),
    })),
  );

  const productEntries = (
    await Promise.all(
      SUPPORTED_LOCALES.map(async (locale) => {
        try {
          const products = await getPublicProducts(locale);
          return products.map((product) => ({
            url: siteUrl(localePath(locale, `/products/${product.slug}`)),
            lastModified: product.updatedAt,
            changeFrequency: "weekly" as const,
            priority: 0.8,
            alternates: localeAlternates(`/products/${product.slug}`),
          }));
        } catch {
          return [];
        }
      }),
    )
  ).flat();

  const contentEntries = (
    await Promise.all(
      SUPPORTED_LOCALES.flatMap((locale) =>
        (["article", "doc"] as const).map(async (contentType) => {
          try {
            const entries = await listPublishedContent(contentType, locale);
            const prefix = contentType === "article" ? "/blog" : "/docs";
            return entries.map((entry) => {
              const path = `${prefix}/${entry.slug}`;
              const url = siteUrl(localePath(locale, path));
              const languages: Record<string, string> = {
                [hreflangCode(locale)]: url,
              };
              if (locale === DEFAULT_LOCALE) languages["x-default"] = url;
              return {
                url,
                lastModified: entry.publishedAt ?? undefined,
                changeFrequency: "weekly" as const,
                priority: 0.6,
                alternates: { languages },
              };
            });
          } catch {
            return [];
          }
        }),
      ),
    )
  ).flat();

  return [...staticEntries, ...productEntries, ...contentEntries];
}
