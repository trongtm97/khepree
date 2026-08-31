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
import type { DeviceSessionRevoker } from "./store";
import { MemoryLicensingRepository } from "./store";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const PRINCIPAL = { type: "USER" as const, id: "user_1" };
const OTHER = { type: "USER" as const, id: "user_2" };
const INSTALL_A = "install-device-aaaa";
const INSTALL_B = "install-device-bbbb";

function recordingAudit(): AuditService & { entries: Array<{ action: string; resourceId?: string }> } {
  const entries: Array<{ action: string; resourceId?: string }> = [];
  return {
    entries,
    record: async (input) => {
      entries.push({ action: input.action, resourceId: input.resourceId ?? undefined });
    },
  };
}

function sessionRevoker(): DeviceSessionRevoker & { revoked: string[] } {
  const revoked: string[] = [];
  return {
    revoked,
    revokeSessionsForDevice: async (deviceId) => {
      revoked.push(deviceId);
      return 1;
    },
  };
}

async function seeded(options?: {
  deviceLimit?: number;
  transferLimit?: number;
  cooldownSeconds?: number;
  revoker?: DeviceSessionRevoker;
}) {
  const entitlementStore = new MemoryEntitlementRepository(() => NOW);
  const entitlement = createEntitlementService({
    store: entitlementStore,
    catalog: new MemoryCatalogReader(
      new Map([
        [
          "plan-1",
          {
            productId: "prod-1",
            productSlug: "noveltrans",
            planId: "plan-1",
            planSlug: "pro",
            licensingMode: "LICENSE_KEY_DEVICE",
            accessTermDays: null,
            features: [
              {
                key: "devices.max",
                value: { valueType: "integer" as const, integerValue: options?.deviceLimit ?? 2 },
              },
              {
                key: "devices.transfers.max",
                value: { valueType: "integer" as const, integerValue: options?.transferLimit ?? 5 },
              },
            ],
          },
        ],
      ]),
    ),
    audit: { record: async () => undefined },
    now: () => NOW,
  });
  await entitlement.grantEntitlement({
    principal: PRINCIPAL,
    productId: "prod-1",
    planId: "plan-1",
    source: "perpetual",
  });
  const store = new MemoryLicensingRepository(() => NOW);
  const audit = recordingAudit();
  const revoker = options?.revoker ?? sessionRevoker();
  const licensing = createLicensingService({
    store,
    entitlement,
    audit,
    keys: generateEphemeralSigningKeys(),
    now: () => NOW,
    deactivateCooldownSeconds: options?.cooldownSeconds ?? 0,
    sessionRevoker: revoker,
  });
  return { licensing, store, entitlement, audit, revoker };
}

describe("removeDevice", () => {
  it("lets the owner remove a device and frees the slot", async () => {
    const { licensing, store } = await seeded({ deviceLimit: 1 });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.removeDevice({
      principal: PRINCIPAL,
      devicePublicId: first.device.publicId,
      actorUserId: PRINCIPAL.id,
    });
    expect(store.devices[0]?.status).toBe("deactivated");
    expect(store.devices[0]?.removedAt).toEqual(NOW);
    expect(store.devices[0]?.removedByUserId).toBe(PRINCIPAL.id);

    const second = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_B,
    });
    expect(second.device.publicId).not.toBe(first.device.publicId);
  });

  it("denies removal by another user", async () => {
    const { licensing } = await seeded();
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await expect(
      licensing.removeDevice({
        principal: OTHER,
        devicePublicId: first.device.publicId,
        actorUserId: OTHER.id,
      }),
    ).rejects.toMatchObject({ code: "INVALID_LICENSE" });
  });

  it("enforces transfer cooldown", async () => {
    const { licensing } = await seeded({ cooldownSeconds: 3600 });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.removeDevice({
      principal: PRINCIPAL,
      devicePublicId: first.device.publicId,
      actorUserId: PRINCIPAL.id,
    });
    const second = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_B,
    });
    await expect(
      licensing.removeDevice({
        principal: PRINCIPAL,
        devicePublicId: second.device.publicId,
        actorUserId: PRINCIPAL.id,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_TRANSFER_COOLDOWN" });
  });

  it("enforces transfer quota from features", async () => {
    const { licensing } = await seeded({ transferLimit: 1, deviceLimit: 2 });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.removeDevice({
      principal: PRINCIPAL,
      devicePublicId: first.device.publicId,
      actorUserId: PRINCIPAL.id,
    });
    const second = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_B,
    });
    await expect(
      licensing.removeDevice({
        principal: PRINCIPAL,
        devicePublicId: second.device.publicId,
        actorUserId: PRINCIPAL.id,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_TRANSFER_LIMIT_REACHED" });
  });

  it("does not treat admin block as owner remove", async () => {
    const { licensing, store } = await seeded();
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.blockDevice(first.device.publicId, "admin_1");
    expect(store.devices[0]?.removedAt).toBeNull();
    await expect(
      licensing.removeDevice({
        principal: PRINCIPAL,
        devicePublicId: first.device.publicId,
        actorUserId: PRINCIPAL.id,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BLOCKED" });
  });

  it("revokes desktop sessions on remove", async () => {
    const revoker = sessionRevoker();
    const { licensing } = await seeded({ revoker });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.removeDevice({
      principal: PRINCIPAL,
      devicePublicId: first.device.publicId,
      actorUserId: PRINCIPAL.id,
    });
    expect(revoker.revoked).toEqual([first.device.id]);
  });

  it("writes audit and removal event", async () => {
    const { licensing, store, audit } = await seeded();
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    await licensing.removeDevice({
      principal: PRINCIPAL,
      devicePublicId: first.device.publicId,
      actorUserId: PRINCIPAL.id,
    });
    expect(audit.entries.some((row) => row.action === "device.removed")).toBe(true);
    expect(store.removalEvents).toHaveLength(1);
  });

  it("returns device limit details without secrets", async () => {
    const { licensing } = await seeded({ deviceLimit: 1 });
    await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    try {
      await licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_B,
      });
      throw new Error("expected limit");
    } catch (error) {
      expect(isLicensingError(error) && error.code).toBe("DEVICE_LIMIT_REACHED");
      if (!isLicensingError(error)) throw error;
      expect(error.details).toMatchObject({
        used: 1,
        max: 1,
        manageDevicesUrl: expect.stringContaining("/devices"),
      });
      expect(JSON.stringify(error.details)).not.toContain("installation");
    }
  });

  it("handles race remove/activate under license lock", async () => {
    const { licensing } = await seeded({ deviceLimit: 1 });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
    });
    const race = await Promise.allSettled([
      licensing.removeDevice({
        principal: PRINCIPAL,
        devicePublicId: first.device.publicId,
        actorUserId: PRINCIPAL.id,
      }),
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: "prod-1",
        installationId: INSTALL_B,
      }),
    ]);
    expect(race.some((row) => row.status === "fulfilled")).toBe(true);
  });

  it("lists managed devices with slots and current marker", async () => {
    const { licensing } = await seeded({ deviceLimit: 2 });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: "prod-1",
      installationId: INSTALL_A,
      platform: "windows",
      deviceName: "Studio PC",
    });
    const view = await licensing.listManagedDevices(PRINCIPAL, {
      currentDevicePublicId: first.device.publicId,
    });
    expect(view.products[0]?.slotsUsed).toBe(1);
    expect(view.products[0]?.slotsMax).toBe(2);
    expect(view.products[0]?.devices[0]?.isCurrent).toBe(true);
    expect(view.products[0]?.devices[0]?.platform).toBe("windows");
  });
});
