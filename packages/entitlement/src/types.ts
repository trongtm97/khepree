import type { EntitlementSource, EntitlementStatus, PrincipalType } from "@khepree/db";
import type { PlanFeatureValue } from "@khepree/db";

export type { EntitlementSource, EntitlementStatus, PrincipalType };

export interface PrincipalRef {
  type: PrincipalType;
  id: string;
}

export interface FeatureSnapshotEntry {
  key: string;
  value: PlanFeatureValue;
}

export interface FeatureSnapshot {
  version: number;
  entries: FeatureSnapshotEntry[];
}

export interface OfflinePolicy {
  leaseTtlSeconds: number;
  gracePeriodSeconds: number;
}

export interface EntitlementRecord {
  id: string;
  publicId: string;
  principalType: PrincipalType;
  principalId: string;
  productId: string;
  planId: string | null;
  status: EntitlementStatus;
  source: EntitlementSource;
  startsAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
  featureSnapshot: FeatureSnapshot;
  featureSnapshotVersion: number;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseRecord {
  id: string;
  publicId: string;
  entitlementId: string;
  status: "active" | "suspended" | "revoked";
  keyHash: string | null;
  keyPrefix: string | null;
  keyLast4: string | null;
  label: string | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantEntitlementInput {
  principal: PrincipalRef;
  productId: string;
  planId: string;
  source: EntitlementSource;
  startsAt?: Date;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
  /** When set, retries with the same order item reuse one row. */
  orderPublicId?: string;
  orderItemId?: string;
  /** Default true. Commerce paid path sets false so licensing handler provisions. */
  provisionLicense?: boolean;
}

export interface UpdateEntitlementInput {
  entitlementId: string;
  planId?: string;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
}

export interface ResolvedFeature {
  key: string;
  value: PlanFeatureValue;
}

export interface ResolvedEntitlement {
  entitlement: EntitlementRecord;
  license: LicenseRecord | null;
  features: ResolvedFeature[];
  productSlug: string | null;
  planSlug: string | null;
}

export interface CatalogSnapshot {
  productId: string;
  productSlug: string;
  planId: string;
  planSlug: string;
  features: FeatureSnapshotEntry[];
  licensingMode: "NONE" | "ACCOUNT" | "DEVICE_LEASE" | "LICENSE_KEY_DEVICE";
  accessTermDays: number | null;
}

export interface CatalogReader {
  getPlanSnapshot(planId: string): Promise<CatalogSnapshot | null>;
  getProductSlug(productId: string): Promise<string | null>;
}

export const DEFAULT_DEVICE_LIMIT = 1;
export const DEFAULT_LEASE_TTL_SECONDS = 86_400;
export const DEFAULT_GRACE_PERIOD_SECONDS = 259_200;
export const DEFAULT_DEVICE_TRANSFER_LIMIT = 5;
export const DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS = 30;
export const DEVICE_LIMIT_FEATURE = "devices.max";
export const DEVICE_TRANSFER_LIMIT_FEATURE = "devices.transfers.max";
export const DEVICE_TRANSFER_WINDOW_FEATURE = "devices.transfers.window_days";
export const LEASE_TTL_FEATURE = "lease.ttl_seconds";
export const LEASE_GRACE_FEATURE = "lease.grace_seconds";
