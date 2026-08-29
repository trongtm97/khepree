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
} from "./service";
export { createLicensingPlatform } from "./platform";
export type { ActivationResult, CreateLicensingServiceOverrides } from "./service";
export type {
  ActivateInput,
  ActivationRecord,
  DeviceRecord,
  LicenseLeasePayload,
  SignedLease,
} from "./types";
export { LEASE_SCHEMA_VERSION } from "./types";
