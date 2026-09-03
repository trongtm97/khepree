export const ENTITLEMENT_PACKAGE = "@khepree/entitlement" as const;

export { EntitlementError, isEntitlementError } from "./errors";
export {
  booleanFeature,
  compactFeatures,
  resolveDesktopCapabilities,
  resolveDeviceLimit,
  resolveDeviceTransferLimit,
  resolveDeviceTransferWindowDays,
  resolveFeatures,
  resolveOfflinePolicy,
  snapshotFromEntries,
} from "./features";
export { createHumanLicenseKey, hashLicenseKey, maskLicenseKey } from "./keys";
export { MemoryEntitlementRepository } from "./store";
export { MemoryCatalogReader, DrizzleCatalogReader } from "./catalog-reader";
export {
  EntitlementService,
  createEntitlementService,
  type GrantResult,
  type CreateEntitlementServiceOverrides,
} from "./service";
export { nextExpiresAt, requiresLicense, accessTermType } from "./access";
export { createEntitlementCommerceHooks, createEntitlementOrderHandlers, principalFromCustomer } from "./commerce-hooks";
export type {
  CatalogReader,
  CatalogSnapshot,
  EntitlementRecord,
  FeatureSnapshot,
  FeatureSnapshotEntry,
  GrantEntitlementInput,
  LicenseRecord,
  OfflinePolicy,
  PrincipalRef,
  ResolvedEntitlement,
  ResolvedFeature,
} from "./types";
export {
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
  MAX_CAPABILITY_INTEGER,
  MAX_CAMPAIGN_PROJECTS_FEATURE,
  MAX_CONCURRENT_NOVELS_FEATURE,
  SERIES_MEMORY_FEATURE,
  WHOLE_BOOK_AUDIT_FEATURE,
} from "./types";
export type { DesktopCapabilities } from "./types";
