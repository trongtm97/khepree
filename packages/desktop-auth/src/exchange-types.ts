export interface DesktopEntitlementSummary {
  entitlementPublicId: string;
  productSlug: string | null;
  planSlug: string | null;
  status: string;
  expiresAt: string | null;
  features: Array<{
    key: string;
    value:
      | { valueType: "boolean"; booleanValue: boolean }
      | { valueType: "integer"; integerValue: number }
      | { valueType: "string"; stringValue: string };
  }>;
}

export interface DesktopExchangeInput {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  devicePublicKey: string;
  installationId: string;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
}

export type DesktopEntitlementAccess =
  | "active"
  | "missing"
  | "expired"
  | "suspended";

export interface DesktopExchangeResult {
  sessionPublicId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  devicePublicId: string;
  user: {
    publicId: string;
    email: string;
    name: string;
  };
  client: {
    clientId: string;
    displayName: string;
    productSlug: string | null;
    status: "active" | "inactive";
  };
  entitlement: DesktopEntitlementSummary | null;
  entitlementAccess: DesktopEntitlementAccess;
}
