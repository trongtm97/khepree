import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  activations,
  createPublicId,
  deviceRemovalEvents,
  devices,
  licenseEvents,
  licenseLeases,
  withTransaction,
  type Database,
} from "@khepree/db";
import { LicensingError } from "./errors";
import type { ActivationRecord, DeviceRecord, LeaseRow } from "./types";
import type {
  InsertActivationInput,
  InsertDeviceInput,
  InsertLeaseInput,
  InsertRemovalEventInput,
  LicensingRepository,
} from "./store";

function mapDevice(row: typeof devices.$inferSelect): DeviceRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    principalType: row.principalType,
    principalId: row.principalId,
    installationHash: row.installationHash,
    platform: row.platform,
    name: row.name,
    status: row.status,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    removedAt: row.removedAt,
    removedByUserId: row.removedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapActivation(row: typeof activations.$inferSelect): ActivationRecord {
  return {
    id: row.id,
    licenseId: row.licenseId,
    deviceId: row.deviceId,
    status: row.status,
    activatedAt: row.activatedAt,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapLease(row: typeof licenseLeases.$inferSelect): LeaseRow {
  return {
    id: row.id,
    licenseId: row.licenseId,
    entitlementId: row.entitlementId,
    deviceId: row.deviceId,
    jti: row.jti,
    leaseHash: row.leaseHash ?? "",
    schemaVersion: row.schemaVersion,
    keyId: row.keyId,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
  };
}

export class DrizzleLicensingRepository implements LicensingRepository {
  constructor(private readonly db: Database) {}

  async withLicenseLock<T>(
    licenseId: string,
    fn: (repo: LicensingRepository) => Promise<T>,
  ): Promise<T> {
    return withTransaction(this.db, async (tx) => {
      await tx.execute(sql`SELECT id FROM licenses WHERE id = ${licenseId} FOR UPDATE`);
      return fn(new DrizzleLicensingRepository(tx));
    });
  }

  async getDeviceByInstallation(
    principalType: DeviceRecord["principalType"],
    principalId: string,
    installationHash: string,
  ): Promise<DeviceRecord | null> {
    const [row] = await this.db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.principalType, principalType),
          eq(devices.principalId, principalId),
          eq(devices.installationHash, installationHash),
        ),
      )
      .limit(1);
    return row ? mapDevice(row) : null;
  }

  async getDeviceById(id: string): Promise<DeviceRecord | null> {
    const [row] = await this.db.select().from(devices).where(eq(devices.id, id)).limit(1);
    return row ? mapDevice(row) : null;
  }

  async getDeviceByPublicId(publicId: string): Promise<DeviceRecord | null> {
    const [row] = await this.db.select().from(devices).where(eq(devices.publicId, publicId)).limit(1);
    return row ? mapDevice(row) : null;
  }

  async listDevicesForPrincipal(
    principalType: DeviceRecord["principalType"],
    principalId: string,
  ): Promise<DeviceRecord[]> {
    const rows = await this.db
      .select()
      .from(devices)
      .where(and(eq(devices.principalType, principalType), eq(devices.principalId, principalId)));
    return rows.map(mapDevice);
  }

  async insertDevice(input: InsertDeviceInput): Promise<DeviceRecord> {
    const [row] = await this.db
      .insert(devices)
      .values({
        publicId: createPublicId("dev"),
        principalType: input.principalType,
        principalId: input.principalId,
        installationHash: input.installationHash,
        platform: input.platform ?? null,
        name: input.name ?? null,
      })
      .returning();
    if (!row) throw new LicensingError("CONFLICT", "Could not register device");
    return mapDevice(row);
  }

  async updateDevice(
    id: string,
    patch: Partial<{
      status: DeviceRecord["status"];
      platform: string | null;
      name: string | null;
      lastSeenAt: Date;
      removedAt: Date | null;
      removedByUserId: string | null;
    }>,
  ): Promise<DeviceRecord> {
    const [row] = await this.db
      .update(devices)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.platform !== undefined ? { platform: patch.platform } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.lastSeenAt ? { lastSeenAt: patch.lastSeenAt } : {}),
        ...(patch.removedAt !== undefined ? { removedAt: patch.removedAt } : {}),
        ...(patch.removedByUserId !== undefined ? { removedByUserId: patch.removedByUserId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning();
    if (!row) throw new LicensingError("NOT_FOUND", "Device not found");
    return mapDevice(row);
  }

  async getActiveActivation(licenseId: string, deviceId: string): Promise<ActivationRecord | null> {
    const [row] = await this.db
      .select()
      .from(activations)
      .where(
        and(
          eq(activations.licenseId, licenseId),
          eq(activations.deviceId, deviceId),
          eq(activations.status, "active"),
        ),
      )
      .limit(1);
    return row ? mapActivation(row) : null;
  }

  async listActiveActivations(licenseId: string): Promise<ActivationRecord[]> {
    const rows = await this.db
      .select()
      .from(activations)
      .where(and(eq(activations.licenseId, licenseId), eq(activations.status, "active")));
    return rows.map(mapActivation);
  }

  async listActivationsForLicense(licenseId: string): Promise<ActivationRecord[]> {
    const rows = await this.db.select().from(activations).where(eq(activations.licenseId, licenseId));
    return rows.map(mapActivation);
  }

  async listActivationsForDevice(deviceId: string): Promise<ActivationRecord[]> {
    const rows = await this.db.select().from(activations).where(eq(activations.deviceId, deviceId));
    return rows.map(mapActivation);
  }

  async insertActivation(input: InsertActivationInput): Promise<ActivationRecord> {
    const [row] = await this.db
      .insert(activations)
      .values({
        licenseId: input.licenseId,
        deviceId: input.deviceId,
      })
      .returning();
    if (!row) throw new LicensingError("CONFLICT", "Could not create activation");
    return mapActivation(row);
  }

  async deactivateActivation(id: string, at: Date): Promise<ActivationRecord> {
    const [row] = await this.db
      .update(activations)
      .set({ status: "deactivated", deactivatedAt: at, updatedAt: at })
      .where(eq(activations.id, id))
      .returning();
    if (!row) throw new LicensingError("NOT_FOUND", "Activation not found");
    return mapActivation(row);
  }

  async lastDeactivationAt(
    principalType: DeviceRecord["principalType"],
    principalId: string,
  ): Promise<Date | null> {
    const [row] = await this.db
      .select({ deactivatedAt: activations.deactivatedAt })
      .from(activations)
      .innerJoin(devices, eq(activations.deviceId, devices.id))
      .where(
        and(
          eq(devices.principalType, principalType),
          eq(devices.principalId, principalId),
          sql`${activations.deactivatedAt} IS NOT NULL`,
        ),
      )
      .orderBy(desc(activations.deactivatedAt))
      .limit(1);
    return row?.deactivatedAt ?? null;
  }

  async insertRemovalEvent(input: InsertRemovalEventInput): Promise<void> {
    await this.db.insert(deviceRemovalEvents).values({
      principalType: input.principalType,
      principalId: input.principalId,
      deviceId: input.deviceId,
      removedByUserId: input.removedByUserId,
      actorType: input.actorType,
      bypassTransferQuota: input.bypassTransferQuota,
    });
  }

  async countRemovalEventsSince(
    principalType: DeviceRecord["principalType"],
    principalId: string,
    since: Date,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(deviceRemovalEvents)
      .where(
        and(
          eq(deviceRemovalEvents.principalType, principalType),
          eq(deviceRemovalEvents.principalId, principalId),
          eq(deviceRemovalEvents.actorType, "owner"),
          eq(deviceRemovalEvents.bypassTransferQuota, false),
          gte(deviceRemovalEvents.createdAt, since),
        ),
      );
    return row?.count ?? 0;
  }

  async insertLease(input: InsertLeaseInput): Promise<LeaseRow> {
    const [row] = await this.db
      .insert(licenseLeases)
      .values({
        licenseId: input.licenseId,
        entitlementId: input.entitlementId,
        deviceId: input.deviceId,
        jti: input.jti,
        leaseHash: input.leaseHash,
        schemaVersion: input.schemaVersion,
        keyId: input.keyId,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!row) throw new LicensingError("CONFLICT", "Could not persist lease");
    return mapLease(row);
  }

  async insertLicenseEvent(
    licenseId: string,
    eventType: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(licenseEvents).values({
      licenseId,
      eventType,
      payload: payload ?? null,
    });
  }
}
