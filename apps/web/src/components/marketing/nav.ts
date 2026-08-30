import type { Messages } from "@/messages/contract";

/** Canonical marketing header nav paths and dropdown keys. */
export const ABOUT_PATH = "/about";

export const RESOURCE_NAV_KEYS = ["blog", "docs", "changelog"] as const;
export type ResourceNavKey = (typeof RESOURCE_NAV_KEYS)[number];

export const RESOURCE_NAV_PATHS: Record<ResourceNavKey, string> = {
  blog: "/blog",
  docs: "/docs",
  changelog: "/changelog",
};

export const RESOURCE_NAV_LABEL_KEYS = {
  blog: "resourceBlog",
  docs: "resourceDocs",
  changelog: "resourceChangelog",
} as const satisfies Record<ResourceNavKey, keyof Messages["nav"]>;

export const SUPPORT_NAV_KEYS = ["support", "contact", "security", "trust"] as const;
export type SupportNavKey = (typeof SUPPORT_NAV_KEYS)[number];

export const SUPPORT_NAV_PATHS: Record<SupportNavKey, string> = {
  support: "/support",
  contact: "/contact",
  security: "/security",
  trust: "/trust",
};

export const SUPPORT_NAV_LABEL_KEYS = {
  support: "supportCenter",
  contact: "supportContact",
  security: "supportSecurity",
  trust: "supportTrust",
} as const satisfies Record<SupportNavKey, keyof Messages["nav"]>;
