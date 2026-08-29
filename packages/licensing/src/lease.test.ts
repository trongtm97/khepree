import { describe, expect, it } from "vitest";
import { generateEphemeralSigningKeys, signLease, verifyLease } from "./lease";
import { LEASE_SCHEMA_VERSION, type LicenseLeasePayload } from "./types";

const NOW = 1_777_478_400;

function payload(overrides: Partial<LicenseLeasePayload> = {}): LicenseLeasePayload {
  return {
    version: LEASE_SCHEMA_VERSION,
    jti: "jti-1",
    subject: "USER:user_1",
    licenseId: "lic-1",
    entitlementId: "ent-1",
    productId: "prod-1",
    productSlug: "sample",
    plan: "sample-pro",
    deviceId: "dev-1",
    featureSnapshotVersion: 1,
    features: { "devices.max": { valueType: "integer", integerValue: 2 } },
    iat: NOW,
    exp: NOW + 86_400,
    ...overrides,
  };
}

describe("signed license leases", () => {
  it("verifies a valid signature", () => {
    const keys = generateEphemeralSigningKeys();
    const token = signLease(payload(), keys);
    const result = verifyLease(token, keys.publicKey, { nowSeconds: NOW + 10, gracePeriodSeconds: 0 });
    expect(result.payload.jti).toBe("jti-1");
    expect(result.grace).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const keys = generateEphemeralSigningKeys();
    const token = signLease(payload(), keys);
    token.payload.plan = "enterprise";
    expect(() =>
      verifyLease(token, keys.publicKey, { nowSeconds: NOW + 10, gracePeriodSeconds: 0 }),
    ).toThrow(/invalid/i);
  });

  it("rejects the wrong public key", () => {
    const keys = generateEphemeralSigningKeys();
    const other = generateEphemeralSigningKeys();
    const token = signLease(payload(), keys);
    expect(() =>
      verifyLease(token, other.publicKey, { nowSeconds: NOW + 10, gracePeriodSeconds: 0 }),
    ).toThrow(/invalid/i);
  });

  it("rejects an expired lease after the grace window", () => {
    const keys = generateEphemeralSigningKeys();
    const token = signLease(payload({ exp: NOW - 10 }), keys);
    expect(() =>
      verifyLease(token, keys.publicKey, { nowSeconds: NOW, gracePeriodSeconds: 0 }),
    ).toThrow(/expired/i);
  });

  it("allows a lease inside the grace period", () => {
    const keys = generateEphemeralSigningKeys();
    const token = signLease(payload({ exp: NOW - 10 }), keys);
    const result = verifyLease(token, keys.publicKey, {
      nowSeconds: NOW,
      gracePeriodSeconds: 60,
    });
    expect(result.grace).toBe(true);
  });
});
