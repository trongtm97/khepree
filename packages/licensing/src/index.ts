export const LICENSING_PACKAGE = "@khepree/licensing" as const;

export { LicensingError, isLicensingError } from "./errors";
export { canonicalizeLeasePayload } from "./canonicalize";
export {
  generateEphemeralSigningKeys,
  publicKeyFromSpkiBase64,
  signLease,
  verifyLease,
} from "./lease";
export { hashInstallationId } from "./hash";
export { MemoryLicensingRepository } from "./store";
export {
  LicensingService,
  createLicensingService,
  DEFAULT_DEACTIVATE_COOLDOWN_SECONDS,
  buildManageDevicesUrl,
} from "./service";
export { createLicensingPlatform } from "./platform";
export { createLicensingOrderHandlers } from "./order-handlers";
export type { ActivationResult, CreateLicensingServiceOverrides } from "./service";
export type {
  ActivateByPrincipalInput,
  ActivateInput,
  ActivationRecord,
  DeviceRecord,
  LicenseLeasePayload,
  ManagedDevicesView,
  RemoveDeviceInput,
  SignedLease,
} from "./types";
export type { DeviceSessionRevoker } from "./store";
export { LEASE_SCHEMA_VERSION } from "./types";
