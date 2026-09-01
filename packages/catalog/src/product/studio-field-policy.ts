/**
 * Product Studio field policy — canonical keys, defaults, and derivation rules.
 * UI orchestration layer; domain tables (products, plans, prices, features) unchanged.
 */

import { DEFAULT_LOCALE } from "@khepree/config";
import type { PlanBillingType } from "./types";

/** Catalog browse/filter categories — stored in products.metadata.productCategory */
export const PRODUCT_CATEGORIES = [
  "ai-tools",
  "translation",
  "productivity",
  "developer-tools",
  "creative",
  "business",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Product delivery type — stored in products.metadata.productType */
export const PRODUCT_TYPES = [
  "desktop-software",
  "web-app",
  "mobile-app",
  "plugin",
  "digital-tool",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Admin-facing access-term presets mapped to plan.billingType + accessTermDays */
export const ACCESS_TERM_PRESETS = [
  { kind: "trial", label: "Trial", billingType: "free" as PlanBillingType, accessTermDays: 1, hoursHint: 24 },
  { kind: "day", label: "Day", billingType: "one_time" as PlanBillingType, accessTermDays: 1 },
  { kind: "month", label: "Month", billingType: "one_time" as PlanBillingType, accessTermDays: 30 },
  { kind: "year", label: "Year", billingType: "one_time" as PlanBillingType, accessTermDays: 365 },
  { kind: "lifetime", label: "Lifetime", billingType: "perpetual" as PlanBillingType, accessTermDays: null },
] as const;
export type AccessTermKind = (typeof ACCESS_TERM_PRESETS)[number]["kind"];

/** Well-known entitlement feature keys — never authorize by plan name */
export const STUDIO_FEATURE_KEYS = {
  devicesMax: "devices.max",
  accountRequired: "account.required",
  deviceTransfersMax: "devices.transfers.max",
  deviceTransfersWindowDays: "devices.transfers.window_days",
  leaseTtlSeconds: "lease.ttl_seconds",
  leaseGraceSeconds: "lease.grace_seconds",
} as const;

export const PRODUCT_DESCRIPTION_TEMPLATE = `# Giới thiệu

# Tính năng nổi bật

# Phù hợp với ai?

# Cách hoạt động

# Yêu cầu hệ thống

# Câu hỏi thường gặp
`;

const CATEGORY_SET = new Set<string>(PRODUCT_CATEGORIES);
const TYPE_SET = new Set<string>(PRODUCT_TYPES);

export function parseProductCategory(metadata: Record<string, unknown> | null | undefined): ProductCategory | null {
  const raw = metadata?.productCategory;
  return typeof raw === "string" && CATEGORY_SET.has(raw) ? (raw as ProductCategory) : null;
}

export function parseProductType(metadata: Record<string, unknown> | null | undefined): ProductType | null {
  const raw = metadata?.productType;
  return typeof raw === "string" && TYPE_SET.has(raw) ? (raw as ProductType) : null;
}

export function parseCoverMediaPublicId(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.coverMediaPublicId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

export function parseRecommendedPlanPublicId(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.recommendedPlanPublicId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

export interface DerivedSeoFields {
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  openGraph: { title: string; description: string; image: "cover" | "icon" | null };
}

export function deriveSeoFields(input: {
  name: string;
  slug: string;
  shortDescription: string | null;
  seoTitleOverride?: string | null;
  seoDescriptionOverride?: string | null;
  hasCover: boolean;
  hasIcon: boolean;
}): DerivedSeoFields {
  const seoTitle = input.seoTitleOverride?.trim() || `${input.name.trim()} | Khepree`;
  const seoDescription = input.seoDescriptionOverride?.trim() || input.shortDescription?.trim() || "";
  const canonicalPath = `/${DEFAULT_LOCALE}/products/${input.slug}`;
  const openGraphImage: DerivedSeoFields["openGraph"]["image"] = input.hasCover
    ? "cover"
    : input.hasIcon
      ? "icon"
      : null;
  return {
    seoTitle,
    seoDescription,
    canonicalPath,
    openGraph: {
      title: input.name.trim(),
      description: input.shortDescription?.trim() || seoDescription,
      image: openGraphImage,
    },
  };
}

/** Merge legacy split fields into one rich description for simplified Studio UI */
export function mergeFullDescription(description: string | null, content: string | null): string {
  const parts = [description?.trim(), content?.trim()].filter((p): p is string => Boolean(p));
  return parts.join("\n\n");
}
