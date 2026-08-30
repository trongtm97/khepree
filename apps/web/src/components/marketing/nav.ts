export const RESOURCE_NAV_KEYS = ["blog", "docs", "productGuides", "security"] as const;

export const RESOURCE_NAV_PATHS: Record<(typeof RESOURCE_NAV_KEYS)[number], string> = {
  blog: "/blog",
  docs: "/docs",
  productGuides: "/docs",
  security: "/security",
};

export const ABOUT_PATH = "/about";
