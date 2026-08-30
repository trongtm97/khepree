import { and, desc, eq, sql } from "drizzle-orm";
import {
  commissions,
  createPublicId,
  partnerCustomers,
  partnerIssues,
  partnerMemberships,
  partnerPrices,
  partners,
  partnerTiers,
  plans,
  products,
  referralAttributions,
  referrals,
  user,
  walletTransactions,
  wallets,
  withTransaction,
  type Database,
  type PartnerMode,
} from "@khepree/db";
import { PartnerError } from "./errors";
import type {
  CommissionRecord,
  CommissionStatus,
  MembershipRecord,
  PartnerCustomerRecord,
  PartnerIssueRecord,
  PartnerPriceRecord,
  PartnerRecord,
  PartnerStatus,
  PlanCatalog,
  ReferralCodeRecord,
  UserDirectory,
  WalletRecord,
  WalletTxRecord,
} from "./types";
import type { PartnerRepository, ReferralAttributionRecord } from "./store";

function mapPartner(
  row: typeof partners.$inferSelect,
  commissionBps: number,
): PartnerRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    tierId: row.tierId,
    status: row.status,
    modes: row.modes ?? ["REFERRAL"],
    allowNegativeBalance: row.allowNegativeBalance,
    defaultCurrency: row.defaultCurrency,
    commissionBps,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzlePartnerRepository implements PartnerRepository {
  constructor(private readonly db: Database) {}

  async withTransaction<T>(fn: (repo: PartnerRepository) => Promise<T>): Promise<T> {
    return withTransaction(this.db, async (tx) => fn(new DrizzlePartnerRepository(tx)));
  }

  async withWalletLock<T>(
    walletId: string,
    fn: (repo: PartnerRepository) => Promise<T>,
  ): Promise<T> {
    return withTransaction(this.db, async (tx) => {
      await tx.execute(sql`SELECT id FROM wallets WHERE id = ${walletId} FOR UPDATE`);
      return fn(new DrizzlePartnerRepository(tx));
    });
  }

  private async loadPartner(row: typeof partners.$inferSelect): Promise<PartnerRecord> {
    let commissionBps = 0;
    if (row.tierId) {
      const [tier] = await this.db
        .select({ commissionBps: partnerTiers.commissionBps })
        .from(partnerTiers)
        .where(eq(partnerTiers.id, row.tierId))
        .limit(1);
      commissionBps = tier?.commissionBps ?? 0;
    }
    return mapPartner(row, commissionBps);
  }

  async insertPartner(
    input: Omit<PartnerRecord, "createdAt" | "updatedAt"> & { createdAt?: Date },
  ): Promise<PartnerRecord> {
    const [row] = await this.db
      .insert(partners)
      .values({
        id: input.id,
        publicId: input.publicId,
        slug: input.slug,
        name: input.name,
        tierId: input.tierId,
        status: input.status,
        modes: input.modes,
        allowNegativeBalance: input.allowNegativeBalance,
        defaultCurrency: input.defaultCurrency,
      })
      .returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not create partner");
    return this.loadPartner(row);
  }

  async getPartnerById(id: string): Promise<PartnerRecord | null> {
    const [row] = await this.db.select().from(partners).where(eq(partners.id, id)).limit(1);
    return row ? this.loadPartner(row) : null;
  }

  async getPartnerByPublicId(publicId: string): Promise<PartnerRecord | null> {
    const [row] = await this.db.select().from(partners).where(eq(partners.publicId, publicId)).limit(1);
    return row ? this.loadPartner(row) : null;
  }

  async getPartnerBySlug(slug: string): Promise<PartnerRecord | null> {
    const [row] = await this.db.select().from(partners).where(eq(partners.slug, slug)).limit(1);
    return row ? this.loadPartner(row) : null;
  }

  async updatePartner(
    id: string,
    patch: Partial<{
      status: PartnerStatus;
      name: string;
      modes: PartnerMode[];
      allowNegativeBalance: boolean;
      tierId: string | null;
    }>,
  ): Promise<PartnerRecord> {
    const [row] = await this.db
      .update(partners)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.modes !== undefined ? { modes: patch.modes } : {}),
        ...(patch.allowNegativeBalance !== undefined
          ? { allowNegativeBalance: patch.allowNegativeBalance }
          : {}),
        ...(patch.tierId !== undefined ? { tierId: patch.tierId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(partners.id, id))
      .returning();
    if (!row) throw new PartnerError("NOT_FOUND", "Partner not found");
    return this.loadPartner(row);
  }

  async insertMembership(row: MembershipRecord): Promise<MembershipRecord> {
    await this.db.insert(partnerMemberships).values(row);
    return row;
  }

  async getMembership(partnerId: string, userId: string): Promise<MembershipRecord | null> {
    const [row] = await this.db
      .select()
      .from(partnerMemberships)
      .where(and(eq(partnerMemberships.partnerId, partnerId), eq(partnerMemberships.userId, userId)))
      .limit(1);
    return row ? { partnerId: row.partnerId, userId: row.userId, role: row.role } : null;
  }

  async listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
    const rows = await this.db
      .select()
      .from(partnerMemberships)
      .where(eq(partnerMemberships.userId, userId));
    return rows.map((row) => ({ partnerId: row.partnerId, userId: row.userId, role: row.role }));
  }

  async listMemberships(partnerId: string): Promise<MembershipRecord[]> {
    const rows = await this.db
      .select()
      .from(partnerMemberships)
      .where(eq(partnerMemberships.partnerId, partnerId));
    return rows.map((row) => ({ partnerId: row.partnerId, userId: row.userId, role: row.role }));
  }

  async getOrCreateWallet(partnerId: string, currency: string): Promise<WalletRecord> {
    const existing = await this.getWalletByPartner(partnerId);
    if (existing) {
      if (existing.currency !== currency) {
        throw new PartnerError("CONFLICT", "Wallet currency does not match partner default");
      }
      return existing;
    }
    const [row] = await this.db.insert(wallets).values({ partnerId, currency }).returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not create wallet");
    return { id: row.id, partnerId: row.partnerId, balanceMinor: row.balanceMinor, currency: row.currency };
  }

  async getWalletByPartner(partnerId: string): Promise<WalletRecord | null> {
    const [row] = await this.db.select().from(wallets).where(eq(wallets.partnerId, partnerId)).limit(1);
    return row
      ? { id: row.id, partnerId: row.partnerId, balanceMinor: row.balanceMinor, currency: row.currency }
      : null;
  }

  async updateWalletBalance(walletId: string, balanceMinor: bigint): Promise<WalletRecord> {
    const [row] = await this.db
      .update(wallets)
      .set({ balanceMinor, updatedAt: new Date() })
      .where(eq(wallets.id, walletId))
      .returning();
    if (!row) throw new PartnerError("NOT_FOUND", "Wallet not found");
    return { id: row.id, partnerId: row.partnerId, balanceMinor: row.balanceMinor, currency: row.currency };
  }

  async insertWalletTx(input: Omit<WalletTxRecord, "id" | "publicId" | "createdAt">): Promise<WalletTxRecord> {
    const [row] = await this.db
      .insert(walletTransactions)
      .values({
        publicId: createPublicId("wtx"),
        walletId: input.walletId,
        amountMinor: input.amountMinor,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      })
      .returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not record wallet transaction");
    return {
      id: row.id,
      publicId: row.publicId,
      walletId: row.walletId,
      amountMinor: row.amountMinor,
      type: row.type,
      idempotencyKey: row.idempotencyKey,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      createdAt: row.createdAt,
    };
  }

  async getWalletTxByIdempotency(walletId: string, key: string): Promise<WalletTxRecord | null> {
    const [row] = await this.db
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.walletId, walletId), eq(walletTransactions.idempotencyKey, key)))
      .limit(1);
    return row
      ? {
          id: row.id,
          publicId: row.publicId,
          walletId: row.walletId,
          amountMinor: row.amountMinor,
          type: row.type,
          idempotencyKey: row.idempotencyKey,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          createdAt: row.createdAt,
        }
      : null;
  }

  async listWalletTx(walletId: string): Promise<WalletTxRecord[]> {
    const rows = await this.db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt));
    return rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      walletId: row.walletId,
      amountMinor: row.amountMinor,
      type: row.type,
      idempotencyKey: row.idempotencyKey,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      createdAt: row.createdAt,
    }));
  }

  async insertReferral(input: { partnerId: string; code: string; label?: string | null }): Promise<ReferralCodeRecord> {
    const [row] = await this.db
      .insert(referrals)
      .values({
        publicId: createPublicId("ref"),
        partnerId: input.partnerId,
        code: input.code.toUpperCase(),
        label: input.label ?? null,
      })
      .returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not create referral code");
    return { id: row.id, publicId: row.publicId, partnerId: row.partnerId, code: row.code, label: row.label };
  }

  async getReferralByCode(code: string): Promise<ReferralCodeRecord | null> {
    const [row] = await this.db
      .select()
      .from(referrals)
      .where(eq(referrals.code, code.toUpperCase()))
      .limit(1);
    return row
      ? { id: row.id, publicId: row.publicId, partnerId: row.partnerId, code: row.code, label: row.label }
      : null;
  }

  async listReferrals(partnerId: string): Promise<ReferralCodeRecord[]> {
    const rows = await this.db.select().from(referrals).where(eq(referrals.partnerId, partnerId));
    return rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      partnerId: row.partnerId,
      code: row.code,
      label: row.label,
    }));
  }

  async insertAttribution(
    row: Omit<ReferralAttributionRecord, "id">,
  ): Promise<ReferralAttributionRecord | "duplicate"> {
    try {
      const [created] = await this.db
        .insert(referralAttributions)
        .values({
          partnerId: row.partnerId,
          referralId: row.referralId,
          kind: row.kind,
          visitorHash: row.visitorHash,
          userId: row.userId,
          orderId: row.orderId,
        })
        .returning();
      if (!created) return "duplicate";
      return {
        id: created.id,
        partnerId: created.partnerId,
        referralId: created.referralId,
        kind: created.kind,
        visitorHash: created.visitorHash,
        userId: created.userId,
        orderId: created.orderId,
      };
    } catch (error) {
      if (isUniqueViolation(error)) return "duplicate";
      throw error;
    }
  }

  async getSignupAttribution(userId: string): Promise<ReferralAttributionRecord | null> {
    const [row] = await this.db
      .select()
      .from(referralAttributions)
      .where(and(eq(referralAttributions.kind, "signup"), eq(referralAttributions.userId, userId)))
      .limit(1);
    return row ? mapAttribution(row) : null;
  }

  async getOrderAttribution(orderId: string): Promise<ReferralAttributionRecord | null> {
    const [row] = await this.db
      .select()
      .from(referralAttributions)
      .where(and(eq(referralAttributions.kind, "order"), eq(referralAttributions.orderId, orderId)))
      .limit(1);
    return row ? mapAttribution(row) : null;
  }

  async listAttributions(partnerId: string): Promise<ReferralAttributionRecord[]> {
    const rows = await this.db
      .select()
      .from(referralAttributions)
      .where(eq(referralAttributions.partnerId, partnerId));
    return rows.map(mapAttribution);
  }

  async insertCommission(input: Omit<CommissionRecord, "id" | "publicId">): Promise<CommissionRecord> {
    const [row] = await this.db
      .insert(commissions)
      .values({
        publicId: createPublicId("com"),
        partnerId: input.partnerId,
        orderId: input.orderId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: input.status,
      })
      .returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not create commission");
    return mapCommission(row);
  }

  async getCommissionByOrder(partnerId: string, orderId: string): Promise<CommissionRecord | null> {
    const [row] = await this.db
      .select()
      .from(commissions)
      .where(and(eq(commissions.partnerId, partnerId), eq(commissions.orderId, orderId)))
      .limit(1);
    return row ? mapCommission(row) : null;
  }

  async getCommissionById(id: string): Promise<CommissionRecord | null> {
    const [row] = await this.db.select().from(commissions).where(eq(commissions.id, id)).limit(1);
    return row ? mapCommission(row) : null;
  }

  async listCommissions(partnerId: string): Promise<CommissionRecord[]> {
    const rows = await this.db.select().from(commissions).where(eq(commissions.partnerId, partnerId));
    return rows.map(mapCommission);
  }

  async updateCommissionStatus(id: string, status: CommissionStatus): Promise<CommissionRecord> {
    const [row] = await this.db
      .update(commissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(commissions.id, id))
      .returning();
    if (!row) throw new PartnerError("NOT_FOUND", "Commission not found");
    return mapCommission(row);
  }

  async getPartnerPrice(partnerId: string, planId: string): Promise<PartnerPriceRecord | null> {
    const [row] = await this.db
      .select()
      .from(partnerPrices)
      .where(and(eq(partnerPrices.partnerId, partnerId), eq(partnerPrices.planId, planId)))
      .limit(1);
    return row
      ? { partnerId: row.partnerId, planId: row.planId, amountMinor: row.amountMinor, currency: row.currency }
      : null;
  }

  async listPartnerPrices(partnerId: string): Promise<PartnerPriceRecord[]> {
    const rows = await this.db.select().from(partnerPrices).where(eq(partnerPrices.partnerId, partnerId));
    return rows.map((row) => ({
      partnerId: row.partnerId,
      planId: row.planId,
      amountMinor: row.amountMinor,
      currency: row.currency,
    }));
  }

  async insertPartnerPrice(row: PartnerPriceRecord): Promise<PartnerPriceRecord> {
    await this.db.insert(partnerPrices).values(row);
    return row;
  }

  async updatePartnerPrice(row: PartnerPriceRecord): Promise<PartnerPriceRecord> {
    const [updated] = await this.db
      .update(partnerPrices)
      .set({ amountMinor: row.amountMinor, currency: row.currency, updatedAt: new Date() })
      .where(and(eq(partnerPrices.partnerId, row.partnerId), eq(partnerPrices.planId, row.planId)))
      .returning();
    if (!updated) throw new PartnerError("NOT_FOUND", "Partner price not found");
    return {
      partnerId: updated.partnerId,
      planId: updated.planId,
      amountMinor: updated.amountMinor,
      currency: updated.currency,
    };
  }

  async insertCustomer(input: { partnerId: string; userId: string }): Promise<PartnerCustomerRecord> {
    const [row] = await this.db
      .insert(partnerCustomers)
      .values({ publicId: createPublicId("pcu"), partnerId: input.partnerId, userId: input.userId })
      .returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not add customer");
    return { id: row.id, publicId: row.publicId, partnerId: row.partnerId, userId: row.userId };
  }

  async getCustomer(partnerId: string, userId: string): Promise<PartnerCustomerRecord | null> {
    const [row] = await this.db
      .select()
      .from(partnerCustomers)
      .where(and(eq(partnerCustomers.partnerId, partnerId), eq(partnerCustomers.userId, userId)))
      .limit(1);
    return row ? { id: row.id, publicId: row.publicId, partnerId: row.partnerId, userId: row.userId } : null;
  }

  async listCustomers(partnerId: string): Promise<PartnerCustomerRecord[]> {
    const rows = await this.db.select().from(partnerCustomers).where(eq(partnerCustomers.partnerId, partnerId));
    return rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      partnerId: row.partnerId,
      userId: row.userId,
    }));
  }

  async insertIssue(input: Omit<PartnerIssueRecord, "id" | "publicId">): Promise<PartnerIssueRecord> {
    const [row] = await this.db
      .insert(partnerIssues)
      .values({
        publicId: createPublicId("pis"),
        partnerId: input.partnerId,
        customerUserId: input.customerUserId,
        entitlementId: input.entitlementId,
        planId: input.planId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        kind: input.kind,
        idempotencyKey: input.idempotencyKey,
      })
      .returning();
    if (!row) throw new PartnerError("CONFLICT", "Could not record issue");
    return mapIssue(row);
  }

  async getIssueByIdempotency(partnerId: string, key: string): Promise<PartnerIssueRecord | null> {
    const [row] = await this.db
      .select()
      .from(partnerIssues)
      .where(and(eq(partnerIssues.partnerId, partnerId), eq(partnerIssues.idempotencyKey, key)))
      .limit(1);
    return row ? mapIssue(row) : null;
  }

  async getIssueById(id: string): Promise<PartnerIssueRecord | null> {
    const [row] = await this.db.select().from(partnerIssues).where(eq(partnerIssues.id, id)).limit(1);
    return row ? mapIssue(row) : null;
  }

  async listIssues(partnerId: string): Promise<PartnerIssueRecord[]> {
    const rows = await this.db.select().from(partnerIssues).where(eq(partnerIssues.partnerId, partnerId));
    return rows.map(mapIssue);
  }
}

function mapAttribution(row: typeof referralAttributions.$inferSelect): ReferralAttributionRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    referralId: row.referralId,
    kind: row.kind,
    visitorHash: row.visitorHash,
    userId: row.userId,
    orderId: row.orderId,
  };
}

function mapCommission(row: typeof commissions.$inferSelect): CommissionRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    partnerId: row.partnerId,
    orderId: row.orderId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
  };
}

function mapIssue(row: typeof partnerIssues.$inferSelect): PartnerIssueRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    partnerId: row.partnerId,
    customerUserId: row.customerUserId,
    entitlementId: row.entitlementId,
    planId: row.planId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    kind: row.kind,
    idempotencyKey: row.idempotencyKey,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export class DrizzleUserDirectory implements UserDirectory {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<{ id: string; email: string; name: string } | null> {
    const normalized = email.trim().toLowerCase();
    const [row] = await this.db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(sql`lower(${user.email}) = ${normalized}`)
      .limit(1);
    return row ?? null;
  }

  async getById(id: string): Promise<{ id: string; email: string; name: string } | null> {
    const [row] = await this.db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return row ?? null;
  }
}

export class DrizzlePlanCatalog implements PlanCatalog {
  constructor(private readonly db: Database) {}

  async getPlan(planId: string) {
    const [row] = await this.db
      .select({
        id: plans.id,
        slug: plans.slug,
        productId: plans.productId,
        productSlug: products.slug,
        billingType: plans.billingType,
        accessTermDays: plans.accessTermDays,
      })
      .from(plans)
      .innerJoin(products, eq(products.id, plans.productId))
      .where(eq(plans.id, planId))
      .limit(1);
    return row ?? null;
  }
}
