import { DEFAULT_LOCALE, SUPPORTED_LOCALES, hreflangCode } from "@khepree/config";
import type { MetadataRoute } from "next";
import { listPublishedContent } from "@/lib/content";
import { getPublicProducts } from "@/lib/catalog";
import { isSupportedLocale, localePath } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo/metadata";
import { PUBLIC_SITEMAP_STATIC_ROUTES } from "@/lib/seo/public-sitemap-routes";

function localeAlternates(
  path: string,
  locales: readonly string[] = SUPPORTED_LOCALES,
): MetadataRoute.Sitemap[number]["alternates"] {
  const supported = locales.filter((locale): locale is (typeof SUPPORTED_LOCALES)[number] =>
    isSupportedLocale(locale),
  );
  const languages: Record<string, string> = Object.fromEntries(
    supported.map((locale) => [hreflangCode(locale), siteUrl(localePath(locale, path || "/"))]),
  );
  const defaultLocale = supported.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : supported[0];
  if (defaultLocale) languages["x-default"] = siteUrl(localePath(defaultLocale, path || "/"));
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
    PUBLIC_SITEMAP_STATIC_ROUTES.map((route) => ({
      url: siteUrl(localePath(locale, route || "/")),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.7,
      alternates: localeAlternates(route),
    })),
  );

  const productBySlug = new Map<
    string,
    { locales: string[]; updatedAt?: Date }
  >();
  await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      try {
        const products = await getPublicProducts(locale);
        for (const product of products) {
          const current = productBySlug.get(product.slug) ?? { locales: [] };
          if (!current.locales.includes(locale)) current.locales.push(locale);
          current.updatedAt = product.updatedAt;
          productBySlug.set(product.slug, current);
        }
      } catch {
        /* empty catalog in local builds */
      }
    }),
  );

  const productEntries: MetadataRoute.Sitemap = [...productBySlug.entries()].flatMap(
    ([slug, info]) =>
      info.locales.filter(isSupportedLocale).map((locale) => ({
        url: siteUrl(localePath(locale, `/products/${slug}`)),
        lastModified: info.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: localeAlternates(`/products/${slug}`, info.locales),
      })),
  );

  const contentByKey = new Map<
    string,
    { locales: string[]; prefix: string; updatedAt?: Date }
  >();
  await Promise.all(
    SUPPORTED_LOCALES.flatMap((locale) =>
      (["article", "doc"] as const).map(async (contentType) => {
        try {
          const entries = await listPublishedContent(contentType, locale);
          const prefix = contentType === "article" ? "/blog" : "/docs";
          for (const entry of entries) {
            const key = `${prefix}:${entry.slug}`;
            const current = contentByKey.get(key) ?? { locales: [], prefix };
            if (!current.locales.includes(locale)) current.locales.push(locale);
            current.updatedAt = entry.updatedAt ?? entry.publishedAt ?? current.updatedAt;
            contentByKey.set(key, current);
          }
        } catch {
          /* empty CMS in local builds */
        }
      }),
    ),
  );

  const contentEntries: MetadataRoute.Sitemap = [...contentByKey.entries()].flatMap(
    ([key, info]) => {
      const slug = key.slice(info.prefix.length + 1);
      const path = `${info.prefix}/${slug}`;
      return info.locales.filter(isSupportedLocale).map((locale) => ({
        url: siteUrl(localePath(locale, path)),
        lastModified: info.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        alternates: localeAlternates(path, info.locales),
      }));
    },
  );

  return [...staticEntries, ...productEntries, ...contentEntries];
}
