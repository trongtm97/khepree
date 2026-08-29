import { createPublicId } from "@khepree/db";
import { LicensingError } from "./errors";
import type { ActivationRecord, DeviceRecord, LeaseRow } from "./types";

export interface InsertDeviceInput {
  principalType: DeviceRecord["principalType"];
  principalId: string;
  installationHash: string;
  platform?: string | null;
  name?: string | null;
}

export interface InsertActivationInput {
  licenseId: string;
  deviceId: string;
}

export interface InsertLeaseInput {
  licenseId: string;
  entitlementId: string;
  deviceId: string;
  jti: string;
  leaseHash: string;
  schemaVersion: number;
  keyId: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface LicensingRepository {
  withLicenseLock<T>(licenseId: string, fn: (repo: LicensingRepository) => Promise<T>): Promise<T>;

  getDeviceByInstallation(
    principalType: DeviceRecord["principalType"],
    principalId: string,
    installationHash: string,
  ): Promise<DeviceRecord | null>;
  getDeviceById(id: string): Promise<DeviceRecord | null>;
  getDeviceByPublicId(publicId: string): Promise<DeviceRecord | null>;
  listDevicesForPrincipal(
    principalType: DeviceRecord["principalType"],
    principalId: string,
  ): Promise<DeviceRecord[]>;
  insertDevice(input: InsertDeviceInput): Promise<DeviceRecord>;
  updateDevice(
    id: string,
    patch: Partial<{
      status: DeviceRecord["status"];
      platform: string | null;
      name: string | null;
      lastSeenAt: Date;
    }>,
  ): Promise<DeviceRecord>;

  getActiveActivation(licenseId: string, deviceId: string): Promise<ActivationRecord | null>;
  listActiveActivations(licenseId: string): Promise<ActivationRecord[]>;
  listActivationsForLicense(licenseId: string): Promise<ActivationRecord[]>;
  listActivationsForDevice(deviceId: string): Promise<ActivationRecord[]>;
  insertActivation(input: InsertActivationInput): Promise<ActivationRecord>;
  deactivateActivation(id: string, at: Date): Promise<ActivationRecord>;
  lastDeactivationAt(
    principalType: DeviceRecord["principalType"],
    principalId: string,
  ): Promise<Date | null>;

  insertLease(input: InsertLeaseInput): Promise<LeaseRow>;
  insertLicenseEvent(licenseId: string, eventType: string, payload?: Record<string, unknown>): Promise<void>;
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value.getTime()) : null;
}

export class MemoryLicensingRepository implements LicensingRepository {
  devices: DeviceRecord[] = [];
  activations: ActivationRecord[] = [];
  leases: LeaseRow[] = [];
  events: Array<{ licenseId: string; eventType: string }> = [];
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async withLicenseLock<T>(
    licenseId: string,
    fn: (repo: LicensingRepository) => Promise<T>,
  ): Promise<T> {
    const previous = this.locks.get(licenseId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      licenseId,
      previous.then(() => gate).catch(() => undefined),
    );
    await previous;
    try {
      return await fn(this);
    } finally {
      release();
    }
  }

  async getDeviceByInstallation(
    principalType: DeviceRecord["principalType"],
    principalId: string,
    installationHash: string,
  ): Promise<DeviceRecord | null> {
    return (
      this.devices.find(
        (row) =>
          row.principalType === principalType &&
          row.principalId === principalId &&
          row.installationHash === installationHash,
      ) ?? null
    );
  }

  async getDeviceById(id: string): Promise<DeviceRecord | null> {
    return this.devices.find((row) => row.id === id) ?? null;
  }

  async getDeviceByPublicId(publicId: string): Promise<DeviceRecord | null> {
    return this.devices.find((row) => row.publicId === publicId) ?? null;
  }

  async listDevicesForPrincipal(
    principalType: DeviceRecord["principalType"],
    principalId: string,
  ): Promise<DeviceRecord[]> {
    return this.devices.filter(
      (row) => row.principalType === principalType && row.principalId === principalId,
    );
  }

  async insertDevice(input: InsertDeviceInput): Promise<DeviceRecord> {
    const now = this.now();
    const row: DeviceRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("dev"),
      principalType: input.principalType,
      principalId: input.principalId,
      installationHash: input.installationHash,
      platform: input.platform ?? null,
      name: input.name ?? null,
      status: "active",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.devices.push(row);
    return row;
  }

  async updateDevice(
    id: string,
    patch: Partial<{
      status: DeviceRecord["status"];
      platform: string | null;
      name: string | null;
      lastSeenAt: Date;
    }>,
  ): Promise<DeviceRecord> {
    const row = this.devices.find((item) => item.id === id);
    if (!row) throw new LicensingError("NOT_FOUND", "Device not found");
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.platform !== undefined) row.platform = patch.platform;
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.lastSeenAt) row.lastSeenAt = new Date(patch.lastSeenAt);
    row.updatedAt = this.now();
    return row;
  }

  async getActiveActivation(licenseId: string, deviceId: string): Promise<ActivationRecord | null> {
    return (
      this.activations.find(
        (row) =>
          row.licenseId === licenseId &&
          row.deviceId === deviceId &&
          row.status === "active" &&
          row.deactivatedAt === null,
      ) ?? null
    );
  }

  async listActiveActivations(licenseId: string): Promise<ActivationRecord[]> {
    return this.activations.filter(
      (row) => row.licenseId === licenseId && row.status === "active" && row.deactivatedAt === null,
    );
  }

  async listActivationsForLicense(licenseId: string): Promise<ActivationRecord[]> {
    return this.activations.filter((row) => row.licenseId === licenseId);
  }

  async listActivationsForDevice(deviceId: string): Promise<ActivationRecord[]> {
    return this.activations.filter((row) => row.deviceId === deviceId);
  }

  async insertActivation(input: InsertActivationInput): Promise<ActivationRecord> {
    const now = this.now();
    const row: ActivationRecord = {
      id: crypto.randomUUID(),
      licenseId: input.licenseId,
      deviceId: input.deviceId,
      status: "active",
      activatedAt: now,
      deactivatedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.activations.push(row);
    return row;
  }

  async deactivateActivation(id: string, at: Date): Promise<ActivationRecord> {
    const row = this.activations.find((item) => item.id === id);
    if (!row) throw new LicensingError("NOT_FOUND", "Activation not found");
    row.status = "deactivated";
    row.deactivatedAt = new Date(at);
    row.updatedAt = at;
    return row;
  }

  async lastDeactivationAt(
    principalType: DeviceRecord["principalType"],
    principalId: string,
  ): Promise<Date | null> {
    const deviceIds = new Set(
      this.devices
        .filter((row) => row.principalType === principalType && row.principalId === principalId)
        .map((row) => row.id),
    );
    let latest: Date | null = null;
    for (const row of this.activations) {
      if (!deviceIds.has(row.deviceId) || !row.deactivatedAt) continue;
      if (!latest || row.deactivatedAt > latest) latest = row.deactivatedAt;
    }
    return cloneDate(latest);
  }

  async insertLease(input: InsertLeaseInput): Promise<LeaseRow> {
    const row: LeaseRow = {
      id: crypto.randomUUID(),
      ...input,
    };
    this.leases.push(row);
    return row;
  }

  async insertLicenseEvent(
    licenseId: string,
    eventType: string,
    _payload?: Record<string, unknown>,
  ): Promise<void> {
    this.events.push({ licenseId, eventType });
  }
}
