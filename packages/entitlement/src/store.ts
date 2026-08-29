import { createPublicId, type EntitlementSource, type EntitlementStatus } from "@khepree/db";
import { EntitlementError } from "./errors";
import type {
  EntitlementRecord,
  FeatureSnapshot,
  LicenseRecord,
  PrincipalRef,
} from "./types";

export interface InsertEntitlementInput {
  principal: PrincipalRef;
  productId: string;
  planId: string | null;
  source: EntitlementSource;
  startsAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
  featureSnapshot: FeatureSnapshot;
  featureSnapshotVersion: number;
}

export interface InsertLicenseInput {
  entitlementId: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string;
  status?: LicenseRecord["status"];
}

export interface EntitlementRepository {
  withTransaction<T>(fn: (repo: EntitlementRepository) => Promise<T>): Promise<T>;
  withPrincipalLock<T>(
    principal: PrincipalRef,
    productId: string,
    fn: (repo: EntitlementRepository) => Promise<T>,
  ): Promise<T>;

  insertEntitlement(input: InsertEntitlementInput): Promise<EntitlementRecord>;
  getEntitlementById(id: string): Promise<EntitlementRecord | null>;
  getEntitlementByPublicId(publicId: string): Promise<EntitlementRecord | null>;
  listEntitlementsForPrincipal(principal: PrincipalRef): Promise<EntitlementRecord[]>;
  findByOrderItem(orderPublicId: string, orderItemId: string): Promise<EntitlementRecord | null>;
  findOpenForProduct(principal: PrincipalRef, productId: string): Promise<EntitlementRecord | null>;
  updateEntitlement(
    id: string,
    patch: Partial<{
      status: EntitlementStatus;
      planId: string | null;
      source: EntitlementSource;
      expiresAt: Date | null;
      metadata: Record<string, unknown>;
      featureSnapshot: FeatureSnapshot;
      featureSnapshotVersion: number;
      revokedAt: Date | null;
    }>,
  ): Promise<EntitlementRecord>;
  listExpiredActive(now: Date): Promise<EntitlementRecord[]>;

  insertLicense(input: InsertLicenseInput): Promise<LicenseRecord>;
  getLicenseByEntitlementId(entitlementId: string): Promise<LicenseRecord | null>;
  getLicenseById(id: string): Promise<LicenseRecord | null>;
  getLicenseByKeyHash(keyHash: string): Promise<LicenseRecord | null>;
  listLicensesByEntitlementIds(ids: string[]): Promise<LicenseRecord[]>;
  updateLicense(
    id: string,
    patch: Partial<{
      status: LicenseRecord["status"];
      revokedAt: Date | null;
      revokedReason: string | null;
      keyHash: string;
      keyPrefix: string;
      keyLast4: string;
    }>,
  ): Promise<LicenseRecord>;
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value.getTime()) : null;
}

export class MemoryEntitlementRepository implements EntitlementRepository {
  entitlements: EntitlementRecord[] = [];
  licenses: LicenseRecord[] = [];
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async withTransaction<T>(fn: (repo: EntitlementRepository) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async withPrincipalLock<T>(
    principal: PrincipalRef,
    productId: string,
    fn: (repo: EntitlementRepository) => Promise<T>,
  ): Promise<T> {
    const key = `${principal.type}:${principal.id}:${productId}`;
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      key,
      previous.then(() => gate).catch(() => undefined),
    );
    await previous;
    try {
      return await fn(this);
    } finally {
      release();
    }
  }

  async insertEntitlement(input: InsertEntitlementInput): Promise<EntitlementRecord> {
    const now = this.now();
    const row: EntitlementRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("ent"),
      principalType: input.principal.type,
      principalId: input.principal.id,
      productId: input.productId,
      planId: input.planId,
      status: "active",
      source: input.source,
      startsAt: new Date(input.startsAt),
      expiresAt: cloneDate(input.expiresAt),
      metadata: { ...input.metadata },
      featureSnapshot: {
        version: input.featureSnapshot.version,
        entries: [...input.featureSnapshot.entries],
      },
      featureSnapshotVersion: input.featureSnapshotVersion,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.entitlements.push(row);
    return row;
  }

  async getEntitlementById(id: string): Promise<EntitlementRecord | null> {
    return this.entitlements.find((row) => row.id === id) ?? null;
  }

  async getEntitlementByPublicId(publicId: string): Promise<EntitlementRecord | null> {
    return this.entitlements.find((row) => row.publicId === publicId) ?? null;
  }

  async listEntitlementsForPrincipal(principal: PrincipalRef): Promise<EntitlementRecord[]> {
    return this.entitlements.filter(
      (row) => row.principalType === principal.type && row.principalId === principal.id,
    );
  }

  async findByOrderItem(orderPublicId: string, orderItemId: string): Promise<EntitlementRecord | null> {
    return (
      this.entitlements.find(
        (row) =>
          row.metadata.orderPublicId === orderPublicId && row.metadata.orderItemId === orderItemId,
      ) ?? null
    );
  }

  async findOpenForProduct(principal: PrincipalRef, productId: string): Promise<EntitlementRecord | null> {
    return (
      this.entitlements.find(
        (row) =>
          row.principalType === principal.type &&
          row.principalId === principal.id &&
          row.productId === productId &&
          (row.status === "active" || row.status === "suspended"),
      ) ?? null
    );
  }

  async updateEntitlement(
    id: string,
    patch: Partial<{
      status: EntitlementStatus;
      planId: string | null;
      source: EntitlementSource;
      expiresAt: Date | null;
      metadata: Record<string, unknown>;
      featureSnapshot: FeatureSnapshot;
      featureSnapshotVersion: number;
      revokedAt: Date | null;
    }>,
  ): Promise<EntitlementRecord> {
    const row = this.entitlements.find((item) => item.id === id);
    if (!row) throw new EntitlementError("NOT_FOUND", "Entitlement not found");
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.planId !== undefined) row.planId = patch.planId;
    if (patch.source !== undefined) row.source = patch.source;
    if (patch.expiresAt !== undefined) row.expiresAt = cloneDate(patch.expiresAt);
    if (patch.metadata) row.metadata = { ...patch.metadata };
    if (patch.featureSnapshot) {
      row.featureSnapshot = {
        version: patch.featureSnapshot.version,
        entries: [...patch.featureSnapshot.entries],
      };
    }
    if (patch.featureSnapshotVersion !== undefined) {
      row.featureSnapshotVersion = patch.featureSnapshotVersion;
    }
    if (patch.revokedAt !== undefined) row.revokedAt = cloneDate(patch.revokedAt);
    row.updatedAt = this.now();
    return row;
  }

  async listExpiredActive(now: Date): Promise<EntitlementRecord[]> {
    return this.entitlements.filter(
      (row) => row.status === "active" && row.expiresAt !== null && row.expiresAt <= now,
    );
  }

  async insertLicense(input: InsertLicenseInput): Promise<LicenseRecord> {
    const now = this.now();
    const row: LicenseRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("lic"),
      entitlementId: input.entitlementId,
      status: input.status ?? "active",
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      keyLast4: input.keyLast4,
      label: null,
      revokedAt: null,
      revokedReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.licenses.push(row);
    return row;
  }

  async getLicenseByEntitlementId(entitlementId: string): Promise<LicenseRecord | null> {
    return this.licenses.find((row) => row.entitlementId === entitlementId) ?? null;
  }

  async getLicenseById(id: string): Promise<LicenseRecord | null> {
    return this.licenses.find((row) => row.id === id) ?? null;
  }

  async getLicenseByKeyHash(keyHash: string): Promise<LicenseRecord | null> {
    return this.licenses.find((row) => row.keyHash === keyHash) ?? null;
  }

  async listLicensesByEntitlementIds(ids: string[]): Promise<LicenseRecord[]> {
    const set = new Set(ids);
    return this.licenses.filter((row) => set.has(row.entitlementId));
  }

  async updateLicense(
    id: string,
    patch: Partial<{
      status: LicenseRecord["status"];
      revokedAt: Date | null;
      revokedReason: string | null;
      keyHash: string;
      keyPrefix: string;
      keyLast4: string;
    }>,
  ): Promise<LicenseRecord> {
    const row = this.licenses.find((item) => item.id === id);
    if (!row) throw new EntitlementError("NOT_FOUND", "License not found");
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.revokedAt !== undefined) row.revokedAt = cloneDate(patch.revokedAt);
    if (patch.revokedReason !== undefined) row.revokedReason = patch.revokedReason;
    if (patch.keyHash !== undefined) row.keyHash = patch.keyHash;
    if (patch.keyPrefix !== undefined) row.keyPrefix = patch.keyPrefix;
    if (patch.keyLast4 !== undefined) row.keyLast4 = patch.keyLast4;
    row.updatedAt = this.now();
    return row;
  }
}
