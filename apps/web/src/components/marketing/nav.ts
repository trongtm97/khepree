export const NAV_KEYS = ["products", "solutions", "pricing", "resources"] as const;

export const NAV_PATHS: Record<(typeof NAV_KEYS)[number], string> = {
  products: "/products",
  solutions: "/solutions",
  pricing: "/pricing",
  resources: "/blog",
};
