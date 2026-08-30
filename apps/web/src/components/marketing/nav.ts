export const NAV_KEYS = ["products", "solutions", "resources", "company"] as const;

export const NAV_PATHS: Record<(typeof NAV_KEYS)[number], string> = {
  products: "/products",
  solutions: "/solutions",
  resources: "/blog",
  company: "/about",
};
