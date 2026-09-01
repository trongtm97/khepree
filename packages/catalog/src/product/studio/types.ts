import type { FeatureValueType, LicensingMode, ProductPlatform } from "@khepree/db";
import type { AccessTermKind, ProductCategory, ProductType } from "../studio-field-policy";
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
  internalCode: string | null;
  billingType: PlanBillingType;
  accessTermDays: number | null;
  status: PlanStatus;
  nameVi: string | null;
  nameEn: string | null;
  prices: StudioPrice[];
  features: StudioPlanFeature[];
  useDefaultDevicePolicy: boolean;
  selfServiceDeviceRemoval: boolean;
  deviceTransferMax: number | null;
  deviceTransferWindowDays: number | null;
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
  productCode: string | null;
  accessFeatureKey: string | null;
  desktopProtocol: string | null;
  desktopClientId: string | null;
  desktopCallbackUri: string | null;
  identityLocked: boolean;
  identityLockReason: string | null;
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
  productType: string | null;
  platformCapabilities: ProductPlatform[];
  planCount: number;
  latestReleaseVersion: string | null;
  updatedAt: Date;
  primaryPlanLabel: string | null;
  primaryPriceLabel: string | null;
  seoOk: boolean;
  readiness: ReadinessResult;
}

export interface SaveStudioDraftInput {
  productId: string;
  actorUserId?: string | null;
  slug?: string;
  productCode?: string;
  accessFeatureKey?: string;
  desktopClientId?: string;
  desktopProtocol?: string;
  licensingMode?: LicensingMode;
  productCategory?: ProductCategory | null;
  productType?: ProductType | null;
  iconMediaPublicId?: string | null;
  coverMediaPublicId?: string | null;
  galleryMediaPublicIds?: string[];
  recommendedPlanPublicId?: string | null;
  operatingSystems?: string[];
  translations: Array<{
    locale: "vi" | "en";
    name?: string;
    shortDescription?: string | null;
    fullDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  }>;
  plans: Array<{
    planId?: string;
    slug?: string;
    internalPlanCode?: string;
    nameVi: string;
    nameEn?: string;
    amountMajor: string;
    termKind: AccessTermKind;
    termCount: number;
    accountRequired: boolean;
    deviceLimit: number;
    useDefaultDevicePolicy?: boolean;
    selfServiceDeviceRemoval?: boolean;
    deviceTransferMax?: number;
    deviceTransferWindowDays?: number;
    useDefaultFeatures?: boolean;
    recommended?: boolean;
    remove?: boolean;
  }>;
  autoSlugFromName?: boolean;
  autoSeo?: boolean;
}

export interface SaveStudioDraftResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
