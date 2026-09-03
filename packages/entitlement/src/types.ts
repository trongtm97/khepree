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

// --- Novel / campaign capabilities (Phase 19) ---
// These are resolved by desktop from the lease `features` map. Safe defaults mean "disabled / single".
export const BATCH_IMPORT_FEATURE = "batch_import_enabled";
export const CAMPAIGNS_FEATURE = "campaigns_enabled";
export const MAX_CAMPAIGN_PROJECTS_FEATURE = "max_campaign_projects";
export const MAX_CONCURRENT_NOVELS_FEATURE = "max_concurrent_novels";
export const WHOLE_BOOK_AUDIT_FEATURE = "whole_book_audit_enabled";
export const SERIES_MEMORY_FEATURE = "series_memory_enabled";
export const CAMPAIGN_STATUS_SYNC_FEATURE = "campaign_status_sync_enabled";

export const DEFAULT_BATCH_IMPORT_ENABLED = false;
export const DEFAULT_CAMPAIGNS_ENABLED = false;
export const DEFAULT_MAX_CAMPAIGN_PROJECTS = 1;
export const DEFAULT_MAX_CONCURRENT_NOVELS = 1;
export const DEFAULT_WHOLE_BOOK_AUDIT_ENABLED = false;
export const DEFAULT_SERIES_MEMORY_ENABLED = false;
export const DEFAULT_CAMPAIGN_STATUS_SYNC_ENABLED = false;

/** Maximum allowed value for integer capability features; prevents accidental infinite grants. */
export const MAX_CAPABILITY_INTEGER = 9_999;

export interface DesktopCapabilities {
  batchImportEnabled: boolean;
  campaignsEnabled: boolean;
  maxCampaignProjects: number;
  maxConcurrentNovels: number;
  wholeBookAuditEnabled: boolean;
  seriesMemoryEnabled: boolean;
  campaignStatusSyncEnabled: boolean;
}
