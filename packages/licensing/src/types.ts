import type { PlanFeatureValue } from "@khepree/db";

export const LEASE_SCHEMA_VERSION = 1 as const;

export interface LicenseLeasePayload {
  version: typeof LEASE_SCHEMA_VERSION;
  jti: string;
  subject: string;
  licenseId: string;
  entitlementId: string;
  productId: string;
  productSlug: string;
  plan: string;
  deviceId: string;
  featureSnapshotVersion: number;
  features: Record<string, PlanFeatureValue>;
  iat: number;
  exp: number;
}

export interface SignedLease {
  payload: LicenseLeasePayload;
  signature: string;
  keyId: string;
}

export interface DeviceRecord {
  id: string;
  publicId: string;
  principalType: "USER" | "ORGANIZATION";
  principalId: string;
  installationHash: string;
  platform: string | null;
  name: string | null;
  status: "active" | "deactivated" | "blocked";
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivationRecord {
  id: string;
  licenseId: string;
  deviceId: string;
  status: "active" | "deactivated";
  activatedAt: Date;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseRow {
  id: string;
  licenseId: string;
  entitlementId: string;
  deviceId: string;
  jti: string;
  leaseHash: string;
  schemaVersion: number;
  keyId: string | null;
  issuedAt: Date;
  expiresAt: Date;
}

export interface ActivateInput {
  licenseKey: string;
  installationId: string;
  platform?: string;
  deviceName?: string;
}

export interface ActivateByPrincipalInput {
  principal: { type: "USER" | "ORGANIZATION"; id: string };
  productId: string;
  installationId: string;
  platform?: string;
  deviceName?: string;
}

export interface RefreshInput {
  licenseKey: string;
  installationId: string;
}

export interface DeactivateInput {
  licenseKey?: string;
  installationId?: string;
  devicePublicId?: string;
  principal?: { type: "USER" | "ORGANIZATION"; id: string };
  actorUserId?: string | null;
}
