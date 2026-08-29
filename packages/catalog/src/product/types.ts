import type { FeatureValueType, PlanFeatureValue } from "@khepree/db";
import type { ProductPlatform } from "@khepree/db";

export type ProductStatus = "draft" | "active" | "hidden" | "retired";
export type PlanBillingType = "free" | "one_time" | "recurring" | "perpetual" | "custom";
export type PlanStatus = "draft" | "active" | "archived";
export type PricingDisplayMode = "free" | "recurring" | "one_time" | "perpetual" | "contact_sales";

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
}

export interface PublicPrice {
  publicId: string;
  currency: string;
  region: string | null;
  amountMinor: number;
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
