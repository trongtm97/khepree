import { describe, expect, it } from "vitest";
import type { AuditService } from "@khepree/db";
import {
  MemoryCatalogReader,
  MemoryEntitlementRepository,
  createEntitlementService,
} from "@khepree/entitlement";
import { isLicensingError } from "./errors";
import { generateEphemeralSigningKeys } from "./lease";
import { createLicensingService } from "./service";
import { MemoryLicensingRepository } from "./store";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const PRINCIPAL = { type: "USER" as const, id: "user_1" };
const INSTALL_A = "install-device-aaaa";
const INSTALL_B = "install-device-bbbb";
const INSTALL_C = "install-device-cccc";

function recordingAudit(): AuditService {
  return { record: async () => undefined };
}

async function seeded() {
  const entitlementStore = new MemoryEntitlementRepository(() => NOW);
  const entitlement = createEntitlementService({
    store: entitlementStore,
    catalog: new MemoryCatalogReader(
      new Map([
        [
          "plan-1",
          {
            productId: "prod-1",
            productSlug: "sample",
            planId: "plan-1",
            planSlug: "sample-pro",
            licensingMode: "LICENSE_KEY_DEVICE",
            accessTermDays: null,
            features: [
              { key: "api_access", value: { valueType: "boolean" as const, booleanValue: true } },
              { key: "devices.max", value: { valueType: "integer" as const, integerValue: 1 } },
            ],
          },
        ],
      ]),
    ),
    audit: recordingAudit(),
    now: () => NOW,
  });
  const granted = await entitlement.grantEntitlement({
    principal: PRINCIPAL,
    productId: "prod-1",
    planId: "plan-1",
    source: "perpetual",
  });
  if (!granted.licenseKey) throw new Error("expected license key");
  const store = new MemoryLicensingRepository(() => NOW);
  const licensing = createLicensingService({
    store,
    entitlement,
    audit: recordingAudit(),
    keys: generateEphemeralSigningKeys(),
    now: () => NOW,
    deactivateCooldownSeconds: 0,
  });
  return { licensing, store, entitlement, licenseKey: granted.licenseKey, granted };
}

describe("activation", () => {
  it("activates against a live entitlement and returns a signed lease", async () => {
    const { licensing, licenseKey } = await seeded();
    const result = await licensing.activate({
      licenseKey,
      installationId: INSTALL_A,
      platform: "windows",
      deviceName: "Studio PC",
    });
    expect(result.lease.payload.productSlug).toBe("sample");
    expect(result.lease.payload.plan).toBe("sample-pro");
    expect(result.lease.signature.length).toBeGreaterThan(20);
    expect(result.device.name).toBe("Studio PC");
  });

  it("enforces the device limit concurrently", async () => {
    const { licensing, licenseKey } = await seeded();
    const attempts = await Promise.allSettled([
      licensing.activate({ licenseKey, installationId: INSTALL_A, platform: "windows" }),
      licensing.activate({ licenseKey, installationId: INSTALL_B, platform: "macos" }),
    ]);
    const fulfilled = attempts.filter((row) => row.status === "fulfilled");
    const rejected = attempts.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(isLicensingError(reason) && reason.code).toBe("DEVICE_LIMIT_REACHED");
  });

  it("reuses the same installation instead of consuming another slot", async () => {
    const { licensing, licenseKey, store } = await seeded();
    await licensing.activate({ licenseKey, installationId: INSTALL_A, platform: "windows" });
    await licensing.activate({ licenseKey, installationId: INSTALL_A, platform: "windows" });
    expect(store.devices).toHaveLength(1);
    expect(store.activations.filter((row) => row.status === "active")).toHaveLength(1);
  });

  it("rejects a blocked device", async () => {
    const { licensing, licenseKey } = await seeded();
    const first = await licensing.activate({
      licenseKey,
      installationId: INSTALL_A,
      platform: "windows",
    });
    await licensing.blockDevice(first.device.publicId);
    await expect(
      licensing.activate({ licenseKey, installationId: INSTALL_A, platform: "windows" }),
    ).rejects.toMatchObject({ code: "DEVICE_BLOCKED" });
  });

  it("rejects activate after revoke", async () => {
    const { licensing, entitlement, granted, licenseKey } = await seeded();
    await entitlement.revokeEntitlement({ entitlementId: granted.entitlement.id });
    await expect(
      licensing.activate({ licenseKey, installationId: INSTALL_C, platform: "linux" }),
    ).rejects.toMatchObject({ code: "LICENSE_REVOKED" });
  });

  it("lets the owner deactivate a device", async () => {
    const { licensing, licenseKey, store } = await seeded();
    const activated = await licensing.activate({
      licenseKey,
      installationId: INSTALL_A,
      platform: "windows",
    });
    await licensing.deactivate({
      principal: PRINCIPAL,
      devicePublicId: activated.device.publicId,
      actorUserId: PRINCIPAL.id,
    });
    expect(store.devices[0]?.status).toBe("deactivated");
    expect(store.activations[0]?.status).toBe("deactivated");
  });
});

describe("activateByPrincipal", () => {
  it("activates without a license key and returns a signed lease", async () => {
    const { licensing } = await seeded();
    const result = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
      platform: "windows",
    });
    expect(result.lease.payload.productSlug).toBe("sample");
    expect(result.lease.signature.length).toBeGreaterThan(20);
  });

  it("returns ENTITLEMENT_MISSING when user has no entitlement", async () => {
    const { licensing } = await seeded();
    await expect(
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "other-product",
        installationId: INSTALL_A,
      }),
    ).rejects.toMatchObject({ code: "ENTITLEMENT_MISSING" });
  });

  it("rejects suspended entitlement", async () => {
    const { licensing, entitlement, granted } = await seeded();
    await entitlement.suspendEntitlement({
      entitlementId: granted.entitlement.id,
      reason: "billing",
    });
    await expect(
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_A,
      }),
    ).rejects.toMatchObject({ code: "ENTITLEMENT_SUSPENDED" });
  });

  it("rejects expired entitlement", async () => {
    const entitlementStore = new MemoryEntitlementRepository(() => NOW);
    const entitlement = createEntitlementService({
      store: entitlementStore,
      catalog: new MemoryCatalogReader(
        new Map([
          [
            "plan-1",
            {
              productId: "prod-1",
              productSlug: "sample",
              planId: "plan-1",
              planSlug: "sample-pro",
              licensingMode: "LICENSE_KEY_DEVICE",
              accessTermDays: 1,
              features: [
                { key: "devices.max", value: { valueType: "integer" as const, integerValue: 2 } },
              ],
            },
          ],
        ]),
      ),
      audit: recordingAudit(),
      now: () => NOW,
    });
    await entitlement.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "subscription",
    });
    const licensing = createLicensingService({
      store: new MemoryLicensingRepository(() => NOW),
      entitlement,
      audit: recordingAudit(),
      keys: generateEphemeralSigningKeys(),
      now: () => new Date("2026-09-30T12:00:00.000Z"),
    });
    await expect(
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_A,
      }),
    ).rejects.toMatchObject({ code: "ENTITLEMENT_EXPIRED" });
  });

  it("reactivates a previously removed device idempotently", async () => {
    const { licensing, store } = await seeded();
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.deactivate({
      principal: PRINCIPAL,
      devicePublicId: first.device.publicId,
    });
    expect(store.devices[0]?.status).toBe("deactivated");
    const second = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    expect(second.device.id).toBe(first.device.id);
    expect(store.devices[0]?.status).toBe("active");
    expect(store.activations.filter((row) => row.status === "active")).toHaveLength(1);
  });

  it("enforces devices.max from features, not plan slug", async () => {
    const { licensing } = await seeded();
    const attempts = await Promise.allSettled([
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_A,
      }),
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_B,
      }),
    ]);
    expect(attempts.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((row) => row.status === "rejected") as PromiseRejectedResult;
    expect(isLicensingError(rejected.reason) && rejected.reason.code).toBe("DEVICE_LIMIT_REACHED");
  });

  it("reuses the same installation without consuming another slot", async () => {
    const { licensing, store } = await seeded();
    await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    expect(store.devices).toHaveLength(1);
    expect(store.activations.filter((row) => row.status === "active")).toHaveLength(1);
  });

  it("rejects blocked devices", async () => {
    const { licensing } = await seeded();
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.blockDevice(first.device.publicId);
    await expect(
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_A,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BLOCKED" });
  });
});
