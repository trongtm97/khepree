export const SDK_VERSION = "0.1.0";

export const LICENSE_ERROR_CODES = [
  "NO_ACTIVE_ENTITLEMENT",
  "LICENSE_REVOKED",
  "ENTITLEMENT_EXPIRED",
  "DEVICE_LIMIT_REACHED",
  "DEVICE_BLOCKED",
  "PRODUCT_NOT_ALLOWED",
  "LEASE_EXPIRED",
  "INVALID_LICENSE",
  "DEVICE_COOLDOWN",
] as const;

export type LicenseErrorCode = (typeof LICENSE_ERROR_CODES)[number];

export type FeatureValue =
  | { valueType: "boolean"; booleanValue: boolean }
  | { valueType: "integer"; integerValue: number }
  | { valueType: "string"; stringValue: string };

export interface EntitlementFeature {
  key: string;
  value: FeatureValue;
}

export interface PublicEntitlement {
  entitlementPublicId: string;
  productSlug: string | null;
  planSlug: string | null;
  status: string;
  source: string;
  startsAt: string;
  expiresAt: string | null;
  features: EntitlementFeature[];
}

export interface LicenseLeasePayload {
  version: 1;
  jti: string;
  subject: string;
  licenseId: string;
  entitlementId: string;
  productId: string;
  productSlug: string;
  plan: string;
  deviceId: string;
  featureSnapshotVersion: number;
  features: Record<string, FeatureValue>;
  iat: number;
  exp: number;
}

export interface SignedLease {
  payload: LicenseLeasePayload;
  signature: string;
  keyId: string;
}

export interface ActivationRequest {
  licenseKey: string;
  installationId: string;
  platform?: string;
  deviceName?: string;
}

export interface ActivationResponse {
  lease: SignedLease;
  publicKey: string;
  keyId: string;
  expiresAt: string;
  devicePublicId: string;
  features: EntitlementFeature[];
}

export interface LicenseSummary {
  licensePublicId: string;
  entitlementPublicId: string;
  productSlug: string | null;
  planSlug: string | null;
  status: string;
  expiresAt: string | null;
  keyHint: string | null;
}

export interface DeviceSummary {
  devicePublicId: string;
  platform: string | null;
  name: string | null;
  status: "active" | "deactivated" | "blocked";
  lastSeenAt: string;
}

export interface ApiErrorBody {
  error: {
    code: LicenseErrorCode | string;
    message: string;
    requestId?: string;
  };
}
