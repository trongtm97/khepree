import type { PlanFeatureValue } from "@khepree/db";
import {
  DEFAULT_DEVICE_LIMIT,
  DEFAULT_GRACE_PERIOD_SECONDS,
  DEFAULT_LEASE_TTL_SECONDS,
  DEVICE_LIMIT_FEATURE,
  LEASE_GRACE_FEATURE,
  LEASE_TTL_FEATURE,
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
