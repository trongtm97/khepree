import type { FeatureValueType, LicensingMode, ProductPlatform } from "@khepree/db";
import type { PlanBillingType, PlanStatus, ProductStatus } from "../types";

export interface StudioTranslation {
  locale: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface StudioPrice {
  id: string;
  publicId: string;
  currency: string;
  region: string | null;
  amountMinor: bigint;
  interval: string | null;
  isActive: boolean;
}

export interface StudioPlanFeature {
  featureId: string;
  key: string;
  name: string;
  valueType: FeatureValueType;
  booleanValue: boolean | null;
  integerValue: number | null;
  stringValue: string | null;
}

export interface StudioPlan {
  id: string;
  publicId: string;
  slug: string;
  billingType: PlanBillingType;
  accessTermDays: number | null;
  status: PlanStatus;
  nameVi: string | null;
  nameEn: string | null;
  prices: StudioPrice[];
  features: StudioPlanFeature[];
}

export interface StudioFeatureOption {
  id: string;
  key: string;
  valueType: FeatureValueType;
  nameVi: string | null;
  nameEn: string | null;
}

export interface ProductStudioSnapshot {
  id: string;
  publicId: string;
  slug: string;
  status: ProductStatus;
  licensingMode: LicensingMode;
  platformCapabilities: ProductPlatform[];
  iconMediaId: string | null;
  iconMediaPublicId: string | null;
  metadata: Record<string, unknown>;
  updatedAt: Date;
  translations: StudioTranslation[];
  plans: StudioPlan[];
  publishedReleaseCount: number;
}

export interface ReadinessItem {
  id: string;
  label: string;
  ok: boolean;
  required: boolean;
}

export interface ReadinessResult {
  ready: boolean;
  blockingCount: number;
  items: ReadinessItem[];
}

export interface StudioListRow {
  id: string;
  publicId: string;
  slug: string;
  status: ProductStatus;
  nameVi: string | null;
  nameEn: string | null;
  iconMediaPublicId: string | null;
  platformCapabilities: ProductPlatform[];
  updatedAt: Date;
  primaryPlanLabel: string | null;
  primaryPriceLabel: string | null;
  seoOk: boolean;
  readiness: ReadinessResult;
}
