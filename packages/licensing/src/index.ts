/** @khepree/licensing — license activation, leases, Ed25519 signing (foundation stub) */
export const LICENSING_PACKAGE = "@khepree/licensing" as const;

export interface LicenseLeasePayload {
  subject: string;
  entitlementId: string;
  licenseId: string;
  product: string;
  plan: string;
  deviceId: string;
  featureSnapshotVersion: number;
  issuedAt: string;
  expiresAt: string;
  leaseId: string;
}
