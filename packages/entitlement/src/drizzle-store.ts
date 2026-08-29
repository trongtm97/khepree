import { and, eq, inArray, lte, sql } from "drizzle-orm";
import {
  createPublicId,
  entitlements,
  licenses,
  withTransaction,
  type Database,
  type EntitlementSource,
  type EntitlementStatus,
} from "@khepree/db";
import { EntitlementError } from "./errors";
import type {
  EntitlementRecord,
  FeatureSnapshot,
  LicenseRecord,
  PrincipalRef,
} from "./types";
import type { EntitlementRepository, InsertEntitlementInput, InsertLicenseInput } from "./store";

function asSnapshot(value: unknown): FeatureSnapshot {
  const row = value as FeatureSnapshot;
  if (!row || !Array.isArray(row.entries)) {
    return { version: 1, entries: [] };
  }
  return { version: row.version ?? 1, entries: row.entries };
}

function mapEntitlement(row: typeof entitlements.$inferSelect): EntitlementRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    principalType: row.principalType,
    principalId: row.principalId,
    productId: row.productId,
    planId: row.planId,
    status: row.status,
    source: row.source,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    metadata: row.metadata ?? {},
    featureSnapshot: asSnapshot(row.featureSnapshot),
    featureSnapshotVersion: row.featureSnapshotVersion,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapLicense(row: typeof licenses.$inferSelect): LicenseRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    entitlementId: row.entitlementId,
    status: row.status,
    keyHash: row.keyHash,
    keyPrefix: row.keyPrefix,
    keyLast4: row.keyLast4,
    label: row.label,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleEntitlementRepository implements EntitlementRepository {
  constructor(private readonly db: Database) {}

  async withTransaction<T>(fn: (repo: EntitlementRepository) => Promise<T>): Promise<T> {
    return withTransaction(this.db, async (tx) => fn(new DrizzleEntitlementRepository(tx)));
  }

  async withPrincipalLock<T>(
    principal: PrincipalRef,
    productId: string,
    fn: (repo: EntitlementRepository) => Promise<T>,
  ): Promise<T> {
    return withTransaction(this.db, async (tx) => {
      const repo = new DrizzleEntitlementRepository(tx);
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`${principal.type}:${principal.id}`}), hashtext(${productId}))`,
      );
      return fn(repo);
    });
  }

  async insertEntitlement(input: InsertEntitlementInput): Promise<EntitlementRecord> {
    const [row] = await this.db
      .insert(entitlements)
      .values({
        publicId: createPublicId("ent"),
        principalType: input.principal.type,
        principalId: input.principal.id,
        productId: input.productId,
        planId: input.planId,
        status: "active",
        source: input.source,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        metadata: input.metadata,
        featureSnapshot: input.featureSnapshot,
        featureSnapshotVersion: input.featureSnapshotVersion,
      })
      .returning();
    if (!row) throw new EntitlementError("CONFLICT", "Could not create entitlement");
    return mapEntitlement(row);
  }

  async getEntitlementById(id: string): Promise<EntitlementRecord | null> {
    const [row] = await this.db.select().from(entitlements).where(eq(entitlements.id, id)).limit(1);
    return row ? mapEntitlement(row) : null;
  }

  async getEntitlementByPublicId(publicId: string): Promise<EntitlementRecord | null> {
    const [row] = await this.db
      .select()
      .from(entitlements)
      .where(eq(entitlements.publicId, publicId))
      .limit(1);
    return row ? mapEntitlement(row) : null;
  }

  async listEntitlementsForPrincipal(principal: PrincipalRef): Promise<EntitlementRecord[]> {
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(
        and(
          eq(entitlements.principalType, principal.type),
          eq(entitlements.principalId, principal.id),
        ),
      );
    return rows.map(mapEntitlement);
  }

  async findByOrderItem(orderPublicId: string, orderItemId: string): Promise<EntitlementRecord | null> {
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(
        sql`${entitlements.metadata}->>'orderPublicId' = ${orderPublicId} AND ${entitlements.metadata}->>'orderItemId' = ${orderItemId}`,
      )
      .limit(1);
    return rows[0] ? mapEntitlement(rows[0]) : null;
  }

  async findOpenForProduct(principal: PrincipalRef, productId: string): Promise<EntitlementRecord | null> {
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(
        and(
          eq(entitlements.principalType, principal.type),
          eq(entitlements.principalId, principal.id),
          eq(entitlements.productId, productId),
          sql`${entitlements.status} IN ('active', 'suspended')`,
        ),
      )
      .limit(1);
    return rows[0] ? mapEntitlement(rows[0]) : null;
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
    const [row] = await this.db
      .update(entitlements)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.planId !== undefined ? { planId: patch.planId } : {}),
        ...(patch.source !== undefined ? { source: patch.source } : {}),
        ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        ...(patch.metadata ? { metadata: patch.metadata } : {}),
        ...(patch.featureSnapshot ? { featureSnapshot: patch.featureSnapshot } : {}),
        ...(patch.featureSnapshotVersion !== undefined
          ? { featureSnapshotVersion: patch.featureSnapshotVersion }
          : {}),
        ...(patch.revokedAt !== undefined ? { revokedAt: patch.revokedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(entitlements.id, id))
      .returning();
    if (!row) throw new EntitlementError("NOT_FOUND", "Entitlement not found");
    return mapEntitlement(row);
  }

  async listExpiredActive(now: Date): Promise<EntitlementRecord[]> {
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(and(eq(entitlements.status, "active"), lte(entitlements.expiresAt, now)));
    return rows.map(mapEntitlement);
  }

  async insertLicense(input: InsertLicenseInput): Promise<LicenseRecord> {
    const [row] = await this.db
      .insert(licenses)
      .values({
        publicId: createPublicId("lic"),
        entitlementId: input.entitlementId,
        status: input.status ?? "active",
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        keyLast4: input.keyLast4,
      })
      .returning();
    if (!row) throw new EntitlementError("CONFLICT", "Could not create license");
    return mapLicense(row);
  }

  async getLicenseByEntitlementId(entitlementId: string): Promise<LicenseRecord | null> {
    const [row] = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.entitlementId, entitlementId))
      .limit(1);
    return row ? mapLicense(row) : null;
  }

  async getLicenseById(id: string): Promise<LicenseRecord | null> {
    const [row] = await this.db.select().from(licenses).where(eq(licenses.id, id)).limit(1);
    return row ? mapLicense(row) : null;
  }

  async getLicenseByKeyHash(keyHash: string): Promise<LicenseRecord | null> {
    const [row] = await this.db.select().from(licenses).where(eq(licenses.keyHash, keyHash)).limit(1);
    return row ? mapLicense(row) : null;
  }

  async listLicensesByEntitlementIds(ids: string[]): Promise<LicenseRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(licenses).where(inArray(licenses.entitlementId, ids));
    return rows.map(mapLicense);
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
    const [row] = await this.db
      .update(licenses)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.revokedAt !== undefined ? { revokedAt: patch.revokedAt } : {}),
        ...(patch.revokedReason !== undefined ? { revokedReason: patch.revokedReason } : {}),
        ...(patch.keyHash !== undefined ? { keyHash: patch.keyHash } : {}),
        ...(patch.keyPrefix !== undefined ? { keyPrefix: patch.keyPrefix } : {}),
        ...(patch.keyLast4 !== undefined ? { keyLast4: patch.keyLast4 } : {}),
        updatedAt: new Date(),
      })
      .where(eq(licenses.id, id))
      .returning();
    if (!row) throw new EntitlementError("NOT_FOUND", "License not found");
    return mapLicense(row);
  }
}
