/** Static marketing paths included in /sitemap.xml — no redirects or auth surfaces. */
export const PUBLIC_SITEMAP_STATIC_ROUTES = [
  "",
  "/products",
  "/about",
  "/contact",
  "/support",
  "/blog",
  "/docs",
  "/changelog",
  "/trust",
  "/security",
  "/privacy",
  "/terms",
  "/refund",
  "/eula",
  "/cookies",
] as const;

/** Legacy redirect hubs — must not appear in the public sitemap. */
export const PUBLIC_SITEMAP_EXCLUDED_PATHS = ["/solutions", "/pricing"] as const;
