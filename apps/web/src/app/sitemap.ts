import { SUPPORTED_LOCALES } from "@khepree/config";
import type { MetadataRoute } from "next";
import { localePath } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo/metadata";

const ROUTES = [
  "",
  "/products",
  "/solutions",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  "/docs",
  "/security",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return SUPPORTED_LOCALES.flatMap((locale) =>
    ROUTES.map((route) => ({
      url: siteUrl(localePath(locale, route || "/")),
      lastModified: now,
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          SUPPORTED_LOCALES.map((l) => [l, siteUrl(localePath(l, route || "/"))]),
        ),
      },
    })),
  );
}
