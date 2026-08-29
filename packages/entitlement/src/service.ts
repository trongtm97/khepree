import {
  createDrizzleAuditService,
  getDb,
  isEntitlementActive,
  type AuditService,
  type Database,
} from "@khepree/db";
import { DrizzleCatalogReader } from "./catalog-reader";
import { DrizzleEntitlementRepository } from "./drizzle-store";
import { EntitlementError } from "./errors";
import { resolveFeatures, snapshotFromEntries } from "./features";
import { createHumanLicenseKey } from "./keys";
import type { EntitlementRepository } from "./store";
import type {
  CatalogReader,
  EntitlementRecord,
  GrantEntitlementInput,
  LicenseRecord,
  PrincipalRef,
  ResolvedEntitlement,
  UpdateEntitlementInput,
} from "./types";

export interface EntitlementServiceOptions {
  store: EntitlementRepository;
  catalog: CatalogReader;
  audit: AuditService;
  now?: () => Date;
}

export interface GrantResult {
  entitlement: EntitlementRecord;
  license: LicenseRecord;
  /** Present only when a new key is issued. Never persisted. */
  licenseKey?: string;
}

export class EntitlementService {
  private readonly now: () => Date;

  constructor(private readonly options: EntitlementServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async grantEntitlement(input: GrantEntitlementInput): Promise<GrantResult> {
    return this.options.store.withPrincipalLock(input.principal, input.productId, (repo) =>
      this.grantOn(repo, input),
    );
  }

  async grantComplimentary(
    input: GrantEntitlementInput & { reason: string },
  ): Promise<GrantResult> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new EntitlementError("INVALID_INPUT", "Reason is required");
    }
    if (input.source !== "complimentary" && input.source !== "admin_grant") {
      throw new EntitlementError(
        "INVALID_INPUT",
        "Admin grants must use complimentary or admin_grant",
      );
    }
    return this.grantEntitlement({
      ...input,
      metadata: { ...input.metadata, reason },
    });
  }

  async reissueLicense(input: {
    entitlementId: string;
    reason: string;
    actorUserId?: string | null;
  }): Promise<GrantResult> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new EntitlementError("INVALID_INPUT", "Reason is required");
    }
    const existing = await this.requireEntitlement(input.entitlementId);
    return this.options.store.withPrincipalLock(
      { type: existing.principalType, id: existing.principalId },
      existing.productId,
      async (repo) => {
        const license = await this.requireLicense(repo, existing.id);
        const issued = createHumanLicenseKey();
        const updated = await repo.updateLicense(license.id, {
          keyHash: issued.keyHash,
          keyPrefix: issued.keyPrefix,
          keyLast4: issued.keyLast4,
          status: "active",
          revokedAt: null,
          revokedReason: null,
        });
        await this.options.audit.record({
          actorUserId: input.actorUserId ?? null,
          action: "license.reissued",
          resourceType: "license",
          resourceId: updated.publicId,
          metadata: { reason, keyPrefix: issued.keyPrefix },
        });
        return { entitlement: existing, license: updated, licenseKey: issued.plaintext };
      },
    );
  }

  async updateEntitlement(input: UpdateEntitlementInput): Promise<EntitlementRecord> {
    const existing = await this.requireEntitlement(input.entitlementId);
    const planId = input.planId ?? existing.planId;
    if (!planId) throw new EntitlementError("PRODUCT_NOT_ALLOWED", "Plan is required");
    const snapshot = await this.snapshotForPlan(planId);
    const updated = await this.options.store.updateEntitlement(existing.id, {
      planId,
      expiresAt: input.expiresAt === undefined ? existing.expiresAt : input.expiresAt,
      metadata: input.metadata ? { ...existing.metadata, ...input.metadata } : existing.metadata,
      featureSnapshot: snapshot.featureSnapshot,
      featureSnapshotVersion: snapshot.featureSnapshot.version,
    });
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "entitlement.updated",
      resourceType: "entitlement",
      resourceId: updated.publicId,
    });
    return updated;
  }

  async suspendEntitlement(input: {
    entitlementId: string;
    actorUserId?: string | null;
    reason?: string;
  }): Promise<EntitlementRecord> {
    return this.setStatus(input.entitlementId, "suspended", {
      actorUserId: input.actorUserId,
      reason: input.reason,
      licenseStatus: "suspended",
      action: "entitlement.suspended",
    });
  }

  async revokeEntitlement(input: {
    entitlementId: string;
    actorUserId?: string | null;
    reason?: string;
  }): Promise<EntitlementRecord> {
    const now = this.now();
    const updated = await this.options.store.updateEntitlement(input.entitlementId, {
      status: "revoked",
      revokedAt: now,
    });
    await this.syncLicense(updated.id, "revoked", input.reason ?? "revoked");
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "entitlement.revoked",
      resourceType: "entitlement",
      resourceId: updated.publicId,
      metadata: input.reason ? { reason: input.reason } : null,
    });
    return updated;
  }

  async expireEntitlements(): Promise<number> {
    const now = this.now();
    const rows = await this.options.store.listExpiredActive(now);
    for (const row of rows) {
      await this.options.store.updateEntitlement(row.id, { status: "expired" });
      await this.syncLicense(row.id, "suspended", "expired");
      await this.options.audit.record({
        action: "entitlement.expired",
        resourceType: "entitlement",
        resourceId: row.publicId,
      });
    }
    return rows.length;
  }

  async resolveEntitlementsForPrincipal(principal: PrincipalRef): Promise<ResolvedEntitlement[]> {
    const now = this.now();
    const rows = await this.options.store.listEntitlementsForPrincipal(principal);
    const licenses = await this.options.store.listLicensesByEntitlementIds(rows.map((row) => row.id));
    const byEntitlement = new Map(licenses.map((row) => [row.entitlementId, row]));
    const resolved: ResolvedEntitlement[] = [];
    for (const entitlement of rows) {
      if (entitlement.status === "active" && !isEntitlementActive({ ...entitlement, now })) {
        await this.options.store.updateEntitlement(entitlement.id, { status: "expired" });
        await this.syncLicense(entitlement.id, "suspended", "expired");
        entitlement.status = "expired";
      }
      const productSlug = await this.options.catalog.getProductSlug(entitlement.productId);
      const planSlug = entitlement.planId
        ? ((await this.options.catalog.getPlanSnapshot(entitlement.planId))?.planSlug ?? null)
        : null;
      resolved.push({
        entitlement,
        license: byEntitlement.get(entitlement.id) ?? null,
        features: resolveFeatures(entitlement.featureSnapshot),
        productSlug,
        planSlug,
      });
    }
    return resolved;
  }

  resolveFeaturesFor(entitlement: EntitlementRecord) {
    return resolveFeatures(entitlement.featureSnapshot);
  }

  async canUseProduct(principal: PrincipalRef, productId: string): Promise<boolean> {
    const now = this.now();
    const open = await this.options.store.findOpenForProduct(principal, productId);
    if (!open) return false;
    return isEntitlementActive({ ...open, now });
  }

  async getEntitlement(id: string): Promise<EntitlementRecord | null> {
    return this.options.store.getEntitlementById(id);
  }

  async getLicenseByKeyHash(keyHash: string): Promise<LicenseRecord | null> {
    return this.options.store.getLicenseByKeyHash(keyHash);
  }

  async getLicenseById(id: string): Promise<LicenseRecord | null> {
    return this.options.store.getLicenseById(id);
  }

  async getLicenseForEntitlement(entitlementId: string): Promise<LicenseRecord | null> {
    return this.options.store.getLicenseByEntitlementId(entitlementId);
  }

  async describeProduct(entitlement: EntitlementRecord): Promise<{ productSlug: string; planSlug: string }> {
    const productSlug =
      (await this.options.catalog.getProductSlug(entitlement.productId)) ?? entitlement.productId;
    const planSlug = entitlement.planId
      ? ((await this.options.catalog.getPlanSnapshot(entitlement.planId))?.planSlug ?? "unknown")
      : "unknown";
    return { productSlug, planSlug };
  }

  private async grantOn(repo: EntitlementRepository, input: GrantEntitlementInput): Promise<GrantResult> {
    const snapshot = await this.snapshotForPlan(input.planId);
    if (snapshot.productId !== input.productId) {
      throw new EntitlementError("PRODUCT_NOT_ALLOWED", "Plan does not belong to product");
    }

    const metadata = {
      ...input.metadata,
      ...(input.orderPublicId ? { orderPublicId: input.orderPublicId } : {}),
      ...(input.orderItemId ? { orderItemId: input.orderItemId } : {}),
    };

    if (input.orderPublicId && input.orderItemId) {
      const replayed = await repo.findByOrderItem(input.orderPublicId, input.orderItemId);
      if (replayed) {
        const license = await this.requireLicense(repo, replayed.id);
        return { entitlement: replayed, license };
      }
    }

    const existing = await repo.findOpenForProduct(input.principal, input.productId);
    if (existing) {
      const updated = await repo.updateEntitlement(existing.id, {
        status: "active",
        planId: input.planId,
        source: input.source,
        expiresAt: input.expiresAt === undefined ? existing.expiresAt : (input.expiresAt ?? null),
        metadata: { ...existing.metadata, ...metadata },
        featureSnapshot: snapshot.featureSnapshot,
        featureSnapshotVersion: snapshot.featureSnapshot.version,
        revokedAt: null,
      });
      const license = await this.ensureLicense(repo, updated.id);
      await repo.updateLicense(license.id, { status: "active", revokedAt: null, revokedReason: null });
      await this.options.audit.record({
        actorUserId: input.actorUserId ?? null,
        action: "entitlement.updated",
        resourceType: "entitlement",
        resourceId: updated.publicId,
        metadata: { source: input.source },
      });
      return { entitlement: updated, license: { ...license, status: "active" } };
    }

    const entitlement = await repo.insertEntitlement({
      principal: input.principal,
      productId: input.productId,
      planId: input.planId,
      source: input.source,
      startsAt: input.startsAt ?? this.now(),
      expiresAt: input.expiresAt ?? null,
      metadata,
      featureSnapshot: snapshot.featureSnapshot,
      featureSnapshotVersion: snapshot.featureSnapshot.version,
    });
    const issued = createHumanLicenseKey();
    const license = await repo.insertLicense({
      entitlementId: entitlement.id,
      keyHash: issued.keyHash,
      keyPrefix: issued.keyPrefix,
      keyLast4: issued.keyLast4,
    });
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "entitlement.granted",
      resourceType: "entitlement",
      resourceId: entitlement.publicId,
      metadata: { source: input.source, licensePublicId: license.publicId },
    });
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "license.issued",
      resourceType: "license",
      resourceId: license.publicId,
      metadata: { keyPrefix: issued.keyPrefix },
    });
    return { entitlement, license, licenseKey: issued.plaintext };
  }

  private async snapshotForPlan(planId: string) {
    const plan = await this.options.catalog.getPlanSnapshot(planId);
    if (!plan) throw new EntitlementError("PRODUCT_NOT_ALLOWED", "Plan not found");
    return {
      productId: plan.productId,
      featureSnapshot: snapshotFromEntries(plan.features),
    };
  }

  private async setStatus(
    entitlementId: string,
    status: "suspended" | "expired",
    input: {
      actorUserId?: string | null;
      reason?: string;
      licenseStatus: LicenseRecord["status"];
      action: string;
    },
  ): Promise<EntitlementRecord> {
    const updated = await this.options.store.updateEntitlement(entitlementId, { status });
    await this.syncLicense(updated.id, input.licenseStatus, input.reason);
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resourceType: "entitlement",
      resourceId: updated.publicId,
      metadata: input.reason ? { reason: input.reason } : null,
    });
    return updated;
  }

  private async syncLicense(
    entitlementId: string,
    status: LicenseRecord["status"],
    reason?: string,
  ): Promise<void> {
    const license = await this.options.store.getLicenseByEntitlementId(entitlementId);
    if (!license) return;
    await this.options.store.updateLicense(license.id, {
      status,
      revokedAt: status === "revoked" ? this.now() : license.revokedAt,
      revokedReason: reason ?? license.revokedReason,
    });
  }

  private async ensureLicense(repo: EntitlementRepository, entitlementId: string): Promise<LicenseRecord> {
    const existing = await repo.getLicenseByEntitlementId(entitlementId);
    if (existing) return existing;
    const issued = createHumanLicenseKey();
    return repo.insertLicense({
      entitlementId,
      keyHash: issued.keyHash,
      keyPrefix: issued.keyPrefix,
      keyLast4: issued.keyLast4,
    });
  }

  private async requireLicense(repo: EntitlementRepository, entitlementId: string): Promise<LicenseRecord> {
    const license = await repo.getLicenseByEntitlementId(entitlementId);
    if (!license) throw new EntitlementError("NOT_FOUND", "License not found");
    return license;
  }

  private async requireEntitlement(id: string): Promise<EntitlementRecord> {
    const row = await this.options.store.getEntitlementById(id);
    if (!row) throw new EntitlementError("NOT_FOUND", "Entitlement not found");
    return row;
  }
}

export interface CreateEntitlementServiceOverrides {
  db?: Database | null;
  store?: EntitlementRepository;
  catalog?: CatalogReader;
  audit?: AuditService;
  now?: () => Date;
}

export function createEntitlementService(
  overrides: CreateEntitlementServiceOverrides = {},
): EntitlementService {
  const db = overrides.store ? null : (overrides.db ?? getDb());
  const store = overrides.store ?? (db ? new DrizzleEntitlementRepository(db) : null);
  if (!store) throw new EntitlementError("NOT_CONFIGURED", "Database is not configured");
  const catalog = overrides.catalog ?? (db ? new DrizzleCatalogReader(db) : null);
  if (!catalog) throw new EntitlementError("NOT_CONFIGURED", "Catalog reader is not configured");
  const audit =
    overrides.audit ?? (db ? createDrizzleAuditService(db) : { record: async () => undefined });
  return new EntitlementService({ store, catalog, audit, now: overrides.now });
}
