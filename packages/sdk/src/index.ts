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

export const DESKTOP_ERROR_CODES = [
  "AUTH_REQUIRED",
  "AUTH_CODE_INVALID",
  "AUTH_CODE_EXPIRED",
  "PKCE_INVALID",
  "REDIRECT_URI_INVALID",
  "CLIENT_INACTIVE",
  "SESSION_EXPIRED",
  "SESSION_REVOKED",
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_REUSED",
  "DEVICE_PROOF_INVALID",
  "DEVICE_REPLAY_DETECTED",
  "DEVICE_BLOCKED",
  "DEVICE_REMOVED",
  "DEVICE_LIMIT_REACHED",
  "DEVICE_TRANSFER_COOLDOWN",
  "DEVICE_TRANSFER_LIMIT_REACHED",
  "ENTITLEMENT_MISSING",
  "ENTITLEMENT_EXPIRED",
  "ENTITLEMENT_SUSPENDED",
  "PRODUCT_NOT_FOUND",
  "CHECKOUT_NOT_AVAILABLE",
  "PAYMENT_PENDING",
] as const;

export type DesktopErrorCode = (typeof DESKTOP_ERROR_CODES)[number];

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

/** Registered desktop application exposed to clients — no redirect allowlist secrets. */
export interface DesktopClient {
  clientId: string;
  displayName: string;
  productSlug: string | null;
  status: "active" | "inactive";
}

export interface DesktopAuthExchangeRequest {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  installationId: string;
  devicePublicKey?: string;
  platform?: string;
  deviceName?: string;
}

export interface DesktopAuthExchangeResponse {
  sessionPublicId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  devicePublicId?: string;
  user?: {
    publicId: string;
    email: string;
    name: string;
  };
  client?: DesktopClient;
  entitlement?: DesktopEntitlementSummary | null;
  entitlementAccess?: "active" | "missing" | "expired" | "suspended";
  lease?: SignedLease;
  features?: EntitlementFeature[];
}

export interface DesktopActivateRequest {
  clientId: string;
  installationId: string;
  devicePublicKey?: string;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
}

export interface DesktopActivateResponse {
  lease: SignedLease;
  publicKey: string;
  keyId: string;
  expiresAt: string;
  devicePublicId: string;
  features: EntitlementFeature[];
  entitlement: DesktopEntitlementSummary;
}

export interface DesktopRefreshRequest {
  sessionPublicId: string;
  refreshToken: string;
  deviceProof?: {
    timestamp: number;
    nonce: string;
    signature: string;
    method: string;
    path: string;
    bodySha256: string;
  };
}

export interface DesktopRefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  lease?: SignedLease;
  features?: EntitlementFeature[];
}

export interface DesktopDeviceSummary {
  devicePublicId: string;
  platform: string | null;
  name: string | null;
  status: "active" | "deactivated" | "blocked";
  lastSeenAt: string;
}

export interface DesktopEntitlementSummary {
  entitlementPublicId: string;
  productSlug: string | null;
  planSlug: string | null;
  status: string;
  expiresAt: string | null;
  features: EntitlementFeature[];
}

export interface DesktopBillingSummary {
  hasActiveSubscription: boolean;
  checkoutAvailable: boolean;
  pendingPayment: boolean;
}

export interface DesktopMeResponse {
  sessionPublicId: string;
  user: {
    publicId: string;
    email: string;
    name: string;
  };
  client: DesktopClient;
  entitlement: DesktopEntitlementSummary | null;
  device: DesktopDeviceSummary | null;
  billing: DesktopBillingSummary;
}

export interface ApiErrorBody {
  error: {
    code: LicenseErrorCode | DesktopErrorCode | string;
    message: string;
    requestId?: string;
  };
}
