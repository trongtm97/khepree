import type { FeatureValueType, PlanFeatureValue } from "@khepree/db";
import type { ProductPlatform } from "@khepree/db";

export type ProductStatus = "draft" | "active" | "hidden" | "retired";
export type PlanBillingType = "free" | "one_time" | "recurring" | "perpetual" | "custom";
export type PlanStatus = "draft" | "active" | "archived";
export type PricingDisplayMode = "free" | "recurring" | "one_time" | "perpetual" | "contact_sales";

export const PURCHASABLE_BILLING_TYPES = ["one_time", "recurring", "perpetual"] as const;
export type PurchasableBillingType = (typeof PURCHASABLE_BILLING_TYPES)[number];

export function isPurchasableBillingType(value: PlanBillingType): value is PurchasableBillingType {
  return (PURCHASABLE_BILLING_TYPES as readonly string[]).includes(value);
}

/** Server-side checkout snapshot — includes internal ids for order item FKs. */
export interface PurchasableOffer {
  product: { id: string; publicId: string; slug: string; name: string };
  plan: {
    id: string;
    publicId: string;
    slug: string;
    name: string;
    billingType: PlanBillingType;
  };
  price: {
    id: string;
    publicId: string;
    currency: string;
    amountMinor: bigint;
    interval: string | null;
  };
}

export interface ProductMarketingMetadata {
  benefits?: Array<{ title: string; description: string }>;
  highlights?: Array<{ title: string; description: string }>;
  howItWorks?: Array<{ step: number; title: string; description: string }>;
  faq?: Array<{ question: string; answer: string }>;
  relatedContent?: Array<{ title: string; href: string }>;
  cta?: {
    headline: string;
    description?: string;
    buttonLabel: string;
    buttonHref: string;
  };
}

export interface PublicProductSummary {
  publicId: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  platforms: ProductPlatform[];
  status: ProductStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  locale: string;
  updatedAt: Date;
}

export interface PublicPrice {
  publicId: string;
  currency: string;
  region: string | null;
  /** Integer minor units as a decimal string — JSON/cache safe (never bigint). */
  amountMinor: string;
  amountMinorNumber: number;
  interval: string | null;
  isActive: boolean;
}

export interface PublicPlanFeature {
  key: string;
  name: string;
  valueType: FeatureValueType;
  value: PlanFeatureValue;
}

export interface PublicPlan {
  publicId: string;
  slug: string;
  name: string;
  billingType: PlanBillingType;
  status: PlanStatus;
  features: PublicPlanFeature[];
  prices: PublicPrice[];
  pricingMode: PricingDisplayMode;
}

export interface PublicProductDetail extends PublicProductSummary {
  content: string | null;
  marketing: ProductMarketingMetadata;
  plans: PublicPlan[];
}

export interface PricingProductGroup {
  product: PublicProductSummary;
  plans: PublicPlan[];
}
