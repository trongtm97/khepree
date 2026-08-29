import { getEnv, isLicenseSigningConfigured } from "@khepree/config";
import {
  createDrizzleAuditService,
  getDb,
  isEntitlementActive,
  type AuditService,
  type Database,
} from "@khepree/db";
import {
  compactFeatures,
  createEntitlementService,
  hashLicenseKey,
  resolveDeviceLimit,
  resolveOfflinePolicy,
  type EntitlementService,
  type PrincipalRef,
} from "@khepree/entitlement";
import { canonicalizeLeasePayload } from "./canonicalize";
import { DrizzleLicensingRepository } from "./drizzle-store";
import { LicensingError } from "./errors";
import { hashInstallationId, hashLeaseCanonical } from "./hash";
import {
  generateEphemeralSigningKeys,
  signLease,
  signingKeysFromEnv,
  type SigningKeyPair,
} from "./lease";
import type { LicensingRepository } from "./store";
import {
  LEASE_SCHEMA_VERSION,
  type ActivateInput,
  type ActivationRecord,
  type DeactivateInput,
  type DeviceRecord,
  type LicenseLeasePayload,
  type RefreshInput,
  type SignedLease,
} from "./types";

export const DEFAULT_DEACTIVATE_COOLDOWN_SECONDS = 3_600;

export interface ActivationResult {
  lease: SignedLease;
  device: DeviceRecord;
  activation: ActivationRecord;
  publicKey: string;
  keyId: string;
  features: ReturnType<typeof compactFeatures>;
}

export interface LicensingServiceOptions {
  store: LicensingRepository;
  entitlement: EntitlementService;
  audit: AuditService;
  keys: SigningKeyPair;
  now?: () => Date;
  deactivateCooldownSeconds?: number;
}

export class LicensingService {
  private readonly now: () => Date;
  private readonly cooldownSeconds: number;

  constructor(private readonly options: LicensingServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.cooldownSeconds = options.deactivateCooldownSeconds ?? DEFAULT_DEACTIVATE_COOLDOWN_SECONDS;
  }

  getPublicKey(): string {
    return this.options.keys.publicKeySpkiBase64;
  }

  async resolveFromLicenseKey(licenseKey: string) {
    return this.requireAccess(licenseKey);
  }

  async activate(input: ActivateInput): Promise<ActivationResult> {
    const access = await this.requireAccess(input.licenseKey);
    const installationHash = hashInstallationId(input.installationId);
    const device = await this.getOrCreateDevice(access.principal, installationHash, input);
    if (device.status === "blocked") {
      throw new LicensingError("DEVICE_BLOCKED", "This device is blocked");
    }

    return this.options.store.withLicenseLock(access.license.id, async (repo) => {
      if (device.status === "deactivated") {
        await repo.updateDevice(device.id, { status: "active" });
        device.status = "active";
      }

      let activation = await repo.getActiveActivation(access.license.id, device.id);
      if (!activation) {
        const active = await repo.listActiveActivations(access.license.id);
        const limit = resolveDeviceLimit(access.entitlement.featureSnapshot);
        if (active.length >= limit) {
          throw new LicensingError("DEVICE_LIMIT_REACHED", "Device limit reached for this license");
        }
        activation = await repo.insertActivation({
          licenseId: access.license.id,
          deviceId: device.id,
        });
      }

      await repo.updateDevice(device.id, {
        lastSeenAt: this.now(),
        platform: input.platform ?? device.platform,
        name: input.deviceName ?? device.name,
      });

      const lease = await this.issueLease(repo, access, device);
      await repo.insertLicenseEvent(access.license.id, "activation", {
        devicePublicId: device.publicId,
        jti: lease.payload.jti,
      });
      await this.options.audit.record({
        actorUserId: access.principal.type === "USER" ? access.principal.id : null,
        action: "license.activated",
        resourceType: "license",
        resourceId: access.license.publicId,
        metadata: { devicePublicId: device.publicId },
      });
      return {
        lease,
        device,
        activation,
        publicKey: this.options.keys.publicKeySpkiBase64,
        keyId: this.options.keys.keyId,
        features: compactFeatures(access.entitlement.featureSnapshot),
      };
    });
  }

  async refresh(input: RefreshInput): Promise<ActivationResult> {
    const access = await this.requireAccess(input.licenseKey);
    const installationHash = hashInstallationId(input.installationId);
    const device = await this.options.store.getDeviceByInstallation(
      access.principal.type,
      access.principal.id,
      installationHash,
    );
    if (!device) throw new LicensingError("INVALID_LICENSE", "Device is not registered");
    if (device.status === "blocked") {
      throw new LicensingError("DEVICE_BLOCKED", "This device is blocked");
    }

    return this.options.store.withLicenseLock(access.license.id, async (repo) => {
      const activation = await repo.getActiveActivation(access.license.id, device.id);
      if (!activation) {
        throw new LicensingError("NO_ACTIVE_ENTITLEMENT", "Device is not activated");
      }
      await repo.updateDevice(device.id, { lastSeenAt: this.now() });
      const lease = await this.issueLease(repo, access, device);
      await repo.insertLicenseEvent(access.license.id, "refresh", { jti: lease.payload.jti });
      return {
        lease,
        device,
        activation,
        publicKey: this.options.keys.publicKeySpkiBase64,
        keyId: this.options.keys.keyId,
        features: compactFeatures(access.entitlement.featureSnapshot),
      };
    });
  }

  async deactivate(input: DeactivateInput): Promise<DeviceRecord> {
    const access = input.licenseKey
      ? await this.requireAccess(input.licenseKey)
      : await this.requirePrincipal(input.principal);
    const device = await this.resolveDevice(access.principal, input);
    if (device.principalType !== access.principal.type || device.principalId !== access.principal.id) {
      throw new LicensingError("INVALID_LICENSE", "Device does not belong to this account");
    }
    if (device.status === "blocked") {
      throw new LicensingError("DEVICE_BLOCKED", "This device is blocked");
    }

    await this.assertCooldown(access.principal);

    const licenses = await this.licensesForPrincipal(access.principal);
    const now = this.now();
    for (const license of licenses) {
      const activations = await this.options.store.listActivationsForDevice(device.id);
      for (const activation of activations) {
        if (activation.licenseId === license.id && activation.status === "active") {
          await this.options.store.deactivateActivation(activation.id, now);
          await this.options.store.insertLicenseEvent(license.id, "deactivation", {
            devicePublicId: device.publicId,
          });
          await this.options.audit.record({
            actorUserId: input.actorUserId ?? (access.principal.type === "USER" ? access.principal.id : null),
            action: "license.deactivated",
            resourceType: "license",
            resourceId: license.publicId,
            metadata: { devicePublicId: device.publicId },
          });
        }
      }
    }

    const updated = await this.options.store.updateDevice(device.id, { status: "deactivated" });
    return updated;
  }

  async blockDevice(devicePublicId: string, actorUserId?: string | null): Promise<DeviceRecord> {
    const device = await this.options.store.getDeviceByPublicId(devicePublicId);
    if (!device) throw new LicensingError("NOT_FOUND", "Device not found");
    const activations = await this.options.store.listActivationsForDevice(device.id);
    const now = this.now();
    for (const activation of activations) {
      if (activation.status === "active") {
        await this.options.store.deactivateActivation(activation.id, now);
      }
    }
    const updated = await this.options.store.updateDevice(device.id, { status: "blocked" });
    await this.options.audit.record({
      actorUserId: actorUserId ?? null,
      action: "device.blocked",
      resourceType: "device",
      resourceId: device.publicId,
    });
    return updated;
  }

  async listDevices(principal: PrincipalRef): Promise<DeviceRecord[]> {
    return this.options.store.listDevicesForPrincipal(principal.type, principal.id);
  }

  async listLicenses(principal: PrincipalRef) {
    const resolved = await this.options.entitlement.resolveEntitlementsForPrincipal(principal);
    const out = [];
    for (const row of resolved) {
      const license = row.license;
      if (!license) continue;
      const activations = await this.options.store.listActivationsForLicense(license.id);
      const deviceIds = [...new Set(activations.map((item) => item.deviceId))];
      const devices = (
        await Promise.all(deviceIds.map((id) => this.options.store.getDeviceById(id)))
      ).filter((item): item is DeviceRecord => item !== null);
      out.push({
        ...row,
        license,
        activations,
        devices,
      });
    }
    return out;
  }

  private async issueLease(
    repo: LicensingRepository,
    access: Awaited<ReturnType<LicensingService["requireAccess"]>>,
    device: DeviceRecord,
  ): Promise<SignedLease> {
    const now = this.now();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const offline = resolveOfflinePolicy(access.entitlement.featureSnapshot);
    const slugs = await this.options.entitlement.describeProduct(access.entitlement);
    const payload: LicenseLeasePayload = {
      version: LEASE_SCHEMA_VERSION,
      jti: crypto.randomUUID(),
      subject: `${access.principal.type}:${access.principal.id}`,
      licenseId: access.license.id,
      entitlementId: access.entitlement.id,
      productId: access.entitlement.productId,
      productSlug: slugs.productSlug,
      plan: slugs.planSlug,
      deviceId: device.id,
      featureSnapshotVersion: access.entitlement.featureSnapshotVersion,
      features: compactFeatures(access.entitlement.featureSnapshot),
      iat: nowSeconds,
      exp: nowSeconds + offline.leaseTtlSeconds,
    };
    const lease = signLease(payload, this.options.keys);
    await repo.insertLease({
      licenseId: access.license.id,
      entitlementId: access.entitlement.id,
      deviceId: device.id,
      jti: payload.jti,
      leaseHash: hashLeaseCanonical(canonicalizeLeasePayload(payload)),
      schemaVersion: LEASE_SCHEMA_VERSION,
      keyId: lease.keyId,
      issuedAt: now,
      expiresAt: new Date(payload.exp * 1000),
    });
    return lease;
  }

  private async requireAccess(licenseKey: string) {
    const license = await this.options.entitlement.getLicenseByKeyHash(hashLicenseKey(licenseKey));
    if (!license) throw new LicensingError("INVALID_LICENSE", "License key is invalid");
    if (license.status === "revoked") {
      throw new LicensingError("LICENSE_REVOKED", "License has been revoked");
    }
    const entitlement = await this.options.entitlement.getEntitlement(license.entitlementId);
    if (!entitlement) throw new LicensingError("NO_ACTIVE_ENTITLEMENT", "Entitlement not found");
    if (entitlement.status === "revoked") {
      throw new LicensingError("LICENSE_REVOKED", "License has been revoked");
    }
    if (entitlement.status === "expired") {
      throw new LicensingError("ENTITLEMENT_EXPIRED", "Entitlement has expired");
    }
    if (!isEntitlementActive({ ...entitlement, now: this.now() })) {
      if (entitlement.expiresAt && entitlement.expiresAt <= this.now()) {
        throw new LicensingError("ENTITLEMENT_EXPIRED", "Entitlement has expired");
      }
      throw new LicensingError("NO_ACTIVE_ENTITLEMENT", "No active entitlement");
    }
    const allowed = await this.options.entitlement.canUseProduct(
      { type: entitlement.principalType, id: entitlement.principalId },
      entitlement.productId,
    );
    if (!allowed) {
      throw new LicensingError("PRODUCT_NOT_ALLOWED", "Product is not entitled");
    }
    return {
      license,
      entitlement,
      principal: { type: entitlement.principalType, id: entitlement.principalId } satisfies PrincipalRef,
    };
  }

  private async requirePrincipal(principal?: PrincipalRef) {
    if (!principal) throw new LicensingError("INVALID_LICENSE", "Authentication required");
    return { principal, license: null as null, entitlement: null as null };
  }

  private async resolveDevice(principal: PrincipalRef, input: DeactivateInput): Promise<DeviceRecord> {
    if (input.devicePublicId) {
      const device = await this.options.store.getDeviceByPublicId(input.devicePublicId);
      if (!device) throw new LicensingError("NOT_FOUND", "Device not found");
      return device;
    }
    if (input.installationId) {
      const device = await this.options.store.getDeviceByInstallation(
        principal.type,
        principal.id,
        hashInstallationId(input.installationId),
      );
      if (!device) throw new LicensingError("NOT_FOUND", "Device not found");
      return device;
    }
    throw new LicensingError("INVALID_LICENSE", "Device identity is required");
  }

  private async assertCooldown(principal: PrincipalRef): Promise<void> {
    if (this.cooldownSeconds <= 0) return;
    const last = await this.options.store.lastDeactivationAt(principal.type, principal.id);
    if (!last) return;
    const elapsed = (this.now().getTime() - last.getTime()) / 1000;
    if (elapsed < this.cooldownSeconds) {
      throw new LicensingError("DEVICE_COOLDOWN", "Device deactivation is cooling down");
    }
  }

  private async licensesForPrincipal(principal: PrincipalRef) {
    const resolved = await this.options.entitlement.resolveEntitlementsForPrincipal(principal);
    return resolved.map((row) => row.license).filter((row) => row !== null);
  }

  private async getOrCreateDevice(
    principal: PrincipalRef,
    installationHash: string,
    input: ActivateInput,
  ): Promise<DeviceRecord> {
    const existing = await this.options.store.getDeviceByInstallation(
      principal.type,
      principal.id,
      installationHash,
    );
    if (existing) return existing;
    return this.options.store.insertDevice({
      principalType: principal.type,
      principalId: principal.id,
      installationHash,
      platform: input.platform ?? null,
      name: input.deviceName ?? null,
    });
  }
}

export interface CreateLicensingServiceOverrides {
  db?: Database | null;
  store?: LicensingRepository;
  entitlement?: EntitlementService;
  audit?: AuditService;
  keys?: SigningKeyPair;
  now?: () => Date;
  deactivateCooldownSeconds?: number;
}

export function createLicensingService(
  overrides: CreateLicensingServiceOverrides = {},
): LicensingService {
  const env = getEnv();
  const db = overrides.store ? null : (overrides.db ?? getDb());
  const store = overrides.store ?? (db ? new DrizzleLicensingRepository(db) : null);
  if (!store) throw new LicensingError("NOT_CONFIGURED", "Database is not configured");
  const entitlement =
    overrides.entitlement ?? createEntitlementService({ db: db ?? undefined, now: overrides.now });
  const audit =
    overrides.audit ?? (db ? createDrizzleAuditService(db) : { record: async () => undefined });
  const keys =
    overrides.keys ??
    (isLicenseSigningConfigured(env)
      ? signingKeysFromEnv({
          privateKey: env.LICENSE_SIGNING_PRIVATE_KEY ?? "",
          publicKey: env.LICENSE_SIGNING_PUBLIC_KEY ?? "",
        })
      : loadDevKeys(env.NODE_ENV));
  return new LicensingService({
    store,
    entitlement,
    audit,
    keys,
    now: overrides.now,
    deactivateCooldownSeconds: overrides.deactivateCooldownSeconds,
  });
}

function loadDevKeys(nodeEnv: string): SigningKeyPair {
  if (nodeEnv === "production") {
    throw new LicensingError("NOT_CONFIGURED", "LICENSE_SIGNING_PRIVATE_KEY is required");
  }
  // ponytail: ephemeral in-memory keys for local/dev; production must set env. Restart invalidates leases.
  return generateEphemeralSigningKeys();
}
