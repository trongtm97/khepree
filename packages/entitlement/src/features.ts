import type { PlanFeatureValue } from "@khepree/db";
import {
  BATCH_IMPORT_FEATURE,
  CAMPAIGNS_FEATURE,
  CAMPAIGN_STATUS_SYNC_FEATURE,
  DEFAULT_BATCH_IMPORT_ENABLED,
  DEFAULT_CAMPAIGNS_ENABLED,
  DEFAULT_CAMPAIGN_STATUS_SYNC_ENABLED,
  DEFAULT_DEVICE_LIMIT,
  DEFAULT_DEVICE_TRANSFER_LIMIT,
  DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS,
  DEFAULT_GRACE_PERIOD_SECONDS,
  DEFAULT_LEASE_TTL_SECONDS,
  DEFAULT_MAX_CAMPAIGN_PROJECTS,
  DEFAULT_MAX_CONCURRENT_NOVELS,
  DEFAULT_SERIES_MEMORY_ENABLED,
  DEFAULT_WHOLE_BOOK_AUDIT_ENABLED,
  DEVICE_LIMIT_FEATURE,
  DEVICE_TRANSFER_LIMIT_FEATURE,
  DEVICE_TRANSFER_WINDOW_FEATURE,
  LEASE_GRACE_FEATURE,
  LEASE_TTL_FEATURE,
  MAX_CAMPAIGN_PROJECTS_FEATURE,
  MAX_CONCURRENT_NOVELS_FEATURE,
  SERIES_MEMORY_FEATURE,
  WHOLE_BOOK_AUDIT_FEATURE,
  type DesktopCapabilities,
  type FeatureSnapshot,
  type FeatureSnapshotEntry,
  type OfflinePolicy,
  type ResolvedFeature,
} from "./types";

export function emptySnapshot(version = 1): FeatureSnapshot {
  return { version, entries: [] };
}

export function snapshotFromEntries(
  entries: FeatureSnapshotEntry[],
  version = 1,
): FeatureSnapshot {
  return { version, entries: [...entries].sort((a, b) => a.key.localeCompare(b.key)) };
}

export function resolveFeatures(snapshot: FeatureSnapshot): ResolvedFeature[] {
  return snapshot.entries.map((entry) => ({ key: entry.key, value: entry.value }));
}

export function integerFeature(snapshot: FeatureSnapshot, key: string): number | null {
  const entry = snapshot.entries.find((row) => row.key === key);
  if (!entry || entry.value.valueType !== "integer") return null;
  return entry.value.integerValue;
}

export function resolveDeviceLimit(snapshot: FeatureSnapshot): number {
  const limit = integerFeature(snapshot, DEVICE_LIMIT_FEATURE);
  if (limit === null || limit < 1) return DEFAULT_DEVICE_LIMIT;
  return limit;
}

export function resolveDeviceTransferLimit(snapshot: FeatureSnapshot): number {
  const limit = integerFeature(snapshot, DEVICE_TRANSFER_LIMIT_FEATURE);
  if (limit === null || limit < 0) return DEFAULT_DEVICE_TRANSFER_LIMIT;
  return limit;
}

export function resolveDeviceTransferWindowDays(snapshot: FeatureSnapshot): number {
  const days = integerFeature(snapshot, DEVICE_TRANSFER_WINDOW_FEATURE);
  if (days === null || days < 1) return DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS;
  return days;
}

export function resolveOfflinePolicy(snapshot: FeatureSnapshot): OfflinePolicy {
  return {
    leaseTtlSeconds: integerFeature(snapshot, LEASE_TTL_FEATURE) ?? DEFAULT_LEASE_TTL_SECONDS,
    gracePeriodSeconds: integerFeature(snapshot, LEASE_GRACE_FEATURE) ?? DEFAULT_GRACE_PERIOD_SECONDS,
  };
}

export function featureEnabled(value: PlanFeatureValue): boolean {
  switch (value.valueType) {
    case "boolean":
      return value.booleanValue;
    case "integer":
      return value.integerValue > 0;
    case "string":
      return value.stringValue.length > 0;
    default: {
      const _exhaustive: never = value;
      return Boolean(_exhaustive);
    }
  }
}

export function compactFeatures(snapshot: FeatureSnapshot): Record<string, PlanFeatureValue> {
  const out: Record<string, PlanFeatureValue> = {};
  for (const entry of snapshot.entries) out[entry.key] = entry.value;
  return out;
}

export function booleanFeature(snapshot: FeatureSnapshot, key: string): boolean | null {
  const entry = snapshot.entries.find((row) => row.key === key);
  if (!entry || entry.value.valueType !== "boolean") return null;
  return entry.value.booleanValue;
}

/**
 * Resolve the full desktop capability set from a feature snapshot.
 * Missing keys fall back to safe defaults — old server responses remain safe for new clients,
 * and new server responses remain safe for old clients (old clients just ignore unknown keys).
 */
export function resolveDesktopCapabilities(snapshot: FeatureSnapshot): DesktopCapabilities {
  return {
    batchImportEnabled: booleanFeature(snapshot, BATCH_IMPORT_FEATURE) ?? DEFAULT_BATCH_IMPORT_ENABLED,
    campaignsEnabled: booleanFeature(snapshot, CAMPAIGNS_FEATURE) ?? DEFAULT_CAMPAIGNS_ENABLED,
    maxCampaignProjects: Math.max(1, integerFeature(snapshot, MAX_CAMPAIGN_PROJECTS_FEATURE) ?? DEFAULT_MAX_CAMPAIGN_PROJECTS),
    maxConcurrentNovels: Math.max(1, integerFeature(snapshot, MAX_CONCURRENT_NOVELS_FEATURE) ?? DEFAULT_MAX_CONCURRENT_NOVELS),
    wholeBookAuditEnabled: booleanFeature(snapshot, WHOLE_BOOK_AUDIT_FEATURE) ?? DEFAULT_WHOLE_BOOK_AUDIT_ENABLED,
    seriesMemoryEnabled: booleanFeature(snapshot, SERIES_MEMORY_FEATURE) ?? DEFAULT_SERIES_MEMORY_ENABLED,
    campaignStatusSyncEnabled: booleanFeature(snapshot, CAMPAIGN_STATUS_SYNC_FEATURE) ?? DEFAULT_CAMPAIGN_STATUS_SYNC_ENABLED,
  };
}
