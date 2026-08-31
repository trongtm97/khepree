export const ENTITLEMENT_PACKAGE = "@khepree/entitlement" as const;

export { EntitlementError, isEntitlementError } from "./errors";
export {
  compactFeatures,
  resolveDeviceLimit,
  resolveDeviceTransferLimit,
  resolveDeviceTransferWindowDays,
  resolveFeatures,
  resolveOfflinePolicy,
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
  GrantEntitlementInput,
  LicenseRecord,
  OfflinePolicy,
  PrincipalRef,
  ResolvedEntitlement,
  ResolvedFeature,
} from "./types";
export {
  DEFAULT_DEVICE_LIMIT,
  DEFAULT_DEVICE_TRANSFER_LIMIT,
  DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS,
  DEFAULT_GRACE_PERIOD_SECONDS,
  DEFAULT_LEASE_TTL_SECONDS,
  DEVICE_LIMIT_FEATURE,
  DEVICE_TRANSFER_LIMIT_FEATURE,
  DEVICE_TRANSFER_WINDOW_FEATURE,
} from "./types";
