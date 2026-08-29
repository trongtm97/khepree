import { createPublicId, type PartnerMode } from "@khepree/db";
import type { PartnerRole } from "@khepree/types";
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
  ReferralCodeRecord,
  WalletRecord,
  WalletTxRecord,
} from "./types";

export interface ReferralAttributionRecord {
  id: string;
  partnerId: string;
  referralId: string;
  kind: "click" | "signup" | "order";
  visitorHash: string | null;
  userId: string | null;
  orderId: string | null;
}

export interface PartnerRepository {
  withTransaction<T>(fn: (repo: PartnerRepository) => Promise<T>): Promise<T>;
  withWalletLock<T>(walletId: string, fn: (repo: PartnerRepository) => Promise<T>): Promise<T>;

  insertPartner(input: Omit<PartnerRecord, "createdAt" | "updatedAt"> & { createdAt?: Date }): Promise<PartnerRecord>;
  getPartnerById(id: string): Promise<PartnerRecord | null>;
  getPartnerBySlug(slug: string): Promise<PartnerRecord | null>;
  updatePartner(
    id: string,
    patch: Partial<{ status: PartnerStatus; name: string; modes: PartnerMode[]; allowNegativeBalance: boolean; tierId: string | null; commissionBps: number }>,
  ): Promise<PartnerRecord>;

  insertMembership(row: MembershipRecord): Promise<MembershipRecord>;
  getMembership(partnerId: string, userId: string): Promise<MembershipRecord | null>;
  listMembershipsForUser(userId: string): Promise<MembershipRecord[]>;
  listMemberships(partnerId: string): Promise<MembershipRecord[]>;

  getOrCreateWallet(partnerId: string, currency: string): Promise<WalletRecord>;
  getWalletByPartner(partnerId: string): Promise<WalletRecord | null>;
  updateWalletBalance(walletId: string, balanceMinor: bigint): Promise<WalletRecord>;
  insertWalletTx(input: Omit<WalletTxRecord, "id" | "publicId" | "createdAt">): Promise<WalletTxRecord>;
  getWalletTxByIdempotency(walletId: string, key: string): Promise<WalletTxRecord | null>;
  listWalletTx(walletId: string): Promise<WalletTxRecord[]>;

  insertReferral(input: { partnerId: string; code: string; label?: string | null }): Promise<ReferralCodeRecord>;
  getReferralByCode(code: string): Promise<ReferralCodeRecord | null>;
  listReferrals(partnerId: string): Promise<ReferralCodeRecord[]>;
  insertAttribution(row: Omit<ReferralAttributionRecord, "id">): Promise<ReferralAttributionRecord | "duplicate">;
  getSignupAttribution(userId: string): Promise<ReferralAttributionRecord | null>;
  getOrderAttribution(orderId: string): Promise<ReferralAttributionRecord | null>;
  listAttributions(partnerId: string): Promise<ReferralAttributionRecord[]>;

  insertCommission(input: Omit<CommissionRecord, "id" | "publicId">): Promise<CommissionRecord>;
  getCommissionByOrder(partnerId: string, orderId: string): Promise<CommissionRecord | null>;
  getCommissionById(id: string): Promise<CommissionRecord | null>;
  listCommissions(partnerId: string): Promise<CommissionRecord[]>;
  updateCommissionStatus(id: string, status: CommissionStatus): Promise<CommissionRecord>;

  getPartnerPrice(partnerId: string, planId: string): Promise<PartnerPriceRecord | null>;
  listPartnerPrices(partnerId: string): Promise<PartnerPriceRecord[]>;
  insertPartnerPrice(row: PartnerPriceRecord): Promise<PartnerPriceRecord>;
  updatePartnerPrice(row: PartnerPriceRecord): Promise<PartnerPriceRecord>;

  insertCustomer(input: { partnerId: string; userId: string }): Promise<PartnerCustomerRecord>;
  getCustomer(partnerId: string, userId: string): Promise<PartnerCustomerRecord | null>;
  listCustomers(partnerId: string): Promise<PartnerCustomerRecord[]>;

  insertIssue(input: Omit<PartnerIssueRecord, "id" | "publicId">): Promise<PartnerIssueRecord>;
  getIssueByIdempotency(partnerId: string, key: string): Promise<PartnerIssueRecord | null>;
  getIssueById(id: string): Promise<PartnerIssueRecord | null>;
  listIssues(partnerId: string): Promise<PartnerIssueRecord[]>;
}

export class MemoryPartnerRepository implements PartnerRepository {
  partners: PartnerRecord[] = [];
  memberships: MembershipRecord[] = [];
  wallets: WalletRecord[] = [];
  txs: WalletTxRecord[] = [];
  referrals: ReferralCodeRecord[] = [];
  attributions: ReferralAttributionRecord[] = [];
  commissions: CommissionRecord[] = [];
  prices: PartnerPriceRecord[] = [];
  customers: PartnerCustomerRecord[] = [];
  issues: PartnerIssueRecord[] = [];
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async withTransaction<T>(fn: (repo: PartnerRepository) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async withWalletLock<T>(
    walletId: string,
    fn: (repo: PartnerRepository) => Promise<T>,
  ): Promise<T> {
    const previous = this.locks.get(walletId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      walletId,
      previous.then(() => gate).catch(() => undefined),
    );
    await previous;
    try {
      return await fn(this);
    } finally {
      release();
    }
  }

  async insertPartner(
    input: Omit<PartnerRecord, "createdAt" | "updatedAt"> & { createdAt?: Date },
  ): Promise<PartnerRecord> {
    const row: PartnerRecord = {
      ...input,
      modes: [...input.modes],
      createdAt: input.createdAt ?? this.now(),
      updatedAt: this.now(),
    };
    this.partners.push(row);
    return row;
  }

  async getPartnerById(id: string): Promise<PartnerRecord | null> {
    return this.partners.find((row) => row.id === id) ?? null;
  }

  async getPartnerBySlug(slug: string): Promise<PartnerRecord | null> {
    return this.partners.find((row) => row.slug === slug) ?? null;
  }

  async updatePartner(
    id: string,
    patch: Partial<{ status: PartnerStatus; name: string; modes: PartnerMode[]; allowNegativeBalance: boolean; tierId: string | null; commissionBps: number }>,
  ): Promise<PartnerRecord> {
    const row = this.partners.find((item) => item.id === id);
    if (!row) throw new PartnerError("NOT_FOUND", "Partner not found");
    Object.assign(row, patch, { updatedAt: this.now() });
    return row;
  }

  async insertMembership(row: MembershipRecord): Promise<MembershipRecord> {
    this.memberships.push(row);
    return row;
  }

  async getMembership(partnerId: string, userId: string): Promise<MembershipRecord | null> {
    return this.memberships.find((row) => row.partnerId === partnerId && row.userId === userId) ?? null;
  }

  async listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
    return this.memberships.filter((row) => row.userId === userId);
  }

  async listMemberships(partnerId: string): Promise<MembershipRecord[]> {
    return this.memberships.filter((row) => row.partnerId === partnerId);
  }

  async getOrCreateWallet(partnerId: string, currency: string): Promise<WalletRecord> {
    const existing = await this.getWalletByPartner(partnerId);
    if (existing) return existing;
    const row: WalletRecord = { id: crypto.randomUUID(), partnerId, balanceMinor: 0n, currency };
    this.wallets.push(row);
    return row;
  }

  async getWalletByPartner(partnerId: string): Promise<WalletRecord | null> {
    return this.wallets.find((row) => row.partnerId === partnerId) ?? null;
  }

  async updateWalletBalance(walletId: string, balanceMinor: bigint): Promise<WalletRecord> {
    const row = this.wallets.find((item) => item.id === walletId);
    if (!row) throw new PartnerError("NOT_FOUND", "Wallet not found");
    row.balanceMinor = balanceMinor;
    return row;
  }

  async insertWalletTx(input: Omit<WalletTxRecord, "id" | "publicId" | "createdAt">): Promise<WalletTxRecord> {
    const row: WalletTxRecord = {
      ...input,
      id: crypto.randomUUID(),
      publicId: createPublicId("wtx"),
      createdAt: this.now(),
    };
    this.txs.push(row);
    return row;
  }

  async getWalletTxByIdempotency(walletId: string, key: string): Promise<WalletTxRecord | null> {
    return this.txs.find((row) => row.walletId === walletId && row.idempotencyKey === key) ?? null;
  }

  async listWalletTx(walletId: string): Promise<WalletTxRecord[]> {
    return this.txs.filter((row) => row.walletId === walletId);
  }

  async insertReferral(input: { partnerId: string; code: string; label?: string | null }): Promise<ReferralCodeRecord> {
    const row: ReferralCodeRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("ref"),
      partnerId: input.partnerId,
      code: input.code.toUpperCase(),
      label: input.label ?? null,
    };
    this.referrals.push(row);
    return row;
  }

  async getReferralByCode(code: string): Promise<ReferralCodeRecord | null> {
    return this.referrals.find((row) => row.code === code.toUpperCase()) ?? null;
  }

  async listReferrals(partnerId: string): Promise<ReferralCodeRecord[]> {
    return this.referrals.filter((row) => row.partnerId === partnerId);
  }

  async insertAttribution(
    row: Omit<ReferralAttributionRecord, "id">,
  ): Promise<ReferralAttributionRecord | "duplicate"> {
    if (row.kind === "signup" && row.userId) {
      if (this.attributions.some((item) => item.kind === "signup" && item.userId === row.userId)) {
        return "duplicate";
      }
    }
    if (row.kind === "order" && row.orderId) {
      if (this.attributions.some((item) => item.kind === "order" && item.orderId === row.orderId)) {
        return "duplicate";
      }
    }
    if (row.kind === "click" && row.visitorHash) {
      if (
        this.attributions.some(
          (item) =>
            item.kind === "click" &&
            item.referralId === row.referralId &&
            item.visitorHash === row.visitorHash,
        )
      ) {
        return "duplicate";
      }
    }
    const created = { ...row, id: crypto.randomUUID() };
    this.attributions.push(created);
    return created;
  }

  async getSignupAttribution(userId: string): Promise<ReferralAttributionRecord | null> {
    return this.attributions.find((row) => row.kind === "signup" && row.userId === userId) ?? null;
  }

  async getOrderAttribution(orderId: string): Promise<ReferralAttributionRecord | null> {
    return this.attributions.find((row) => row.kind === "order" && row.orderId === orderId) ?? null;
  }

  async listAttributions(partnerId: string): Promise<ReferralAttributionRecord[]> {
    return this.attributions.filter((row) => row.partnerId === partnerId);
  }

  async insertCommission(input: Omit<CommissionRecord, "id" | "publicId">): Promise<CommissionRecord> {
    const row: CommissionRecord = {
      ...input,
      id: crypto.randomUUID(),
      publicId: createPublicId("com"),
    };
    this.commissions.push(row);
    return row;
  }

  async getCommissionByOrder(partnerId: string, orderId: string): Promise<CommissionRecord | null> {
    return this.commissions.find((row) => row.partnerId === partnerId && row.orderId === orderId) ?? null;
  }

  async getCommissionById(id: string): Promise<CommissionRecord | null> {
    return this.commissions.find((row) => row.id === id) ?? null;
  }

  async listCommissions(partnerId: string): Promise<CommissionRecord[]> {
    return this.commissions.filter((row) => row.partnerId === partnerId);
  }

  async updateCommissionStatus(id: string, status: CommissionStatus): Promise<CommissionRecord> {
    const row = this.commissions.find((item) => item.id === id);
    if (!row) throw new PartnerError("NOT_FOUND", "Commission not found");
    row.status = status;
    return row;
  }

  async getPartnerPrice(partnerId: string, planId: string): Promise<PartnerPriceRecord | null> {
    return this.prices.find((row) => row.partnerId === partnerId && row.planId === planId) ?? null;
  }

  async listPartnerPrices(partnerId: string): Promise<PartnerPriceRecord[]> {
    return this.prices.filter((row) => row.partnerId === partnerId);
  }

  async insertPartnerPrice(row: PartnerPriceRecord): Promise<PartnerPriceRecord> {
    this.prices.push(row);
    return row;
  }

  async updatePartnerPrice(row: PartnerPriceRecord): Promise<PartnerPriceRecord> {
    const existing = this.prices.find(
      (item) => item.partnerId === row.partnerId && item.planId === row.planId,
    );
    if (!existing) throw new PartnerError("NOT_FOUND", "Partner price not found");
    existing.amountMinor = row.amountMinor;
    existing.currency = row.currency;
    return existing;
  }

  async insertCustomer(input: { partnerId: string; userId: string }): Promise<PartnerCustomerRecord> {
    const row: PartnerCustomerRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("pcu"),
      partnerId: input.partnerId,
      userId: input.userId,
    };
    this.customers.push(row);
    return row;
  }

  async getCustomer(partnerId: string, userId: string): Promise<PartnerCustomerRecord | null> {
    return this.customers.find((row) => row.partnerId === partnerId && row.userId === userId) ?? null;
  }

  async listCustomers(partnerId: string): Promise<PartnerCustomerRecord[]> {
    return this.customers.filter((row) => row.partnerId === partnerId);
  }

  async insertIssue(input: Omit<PartnerIssueRecord, "id" | "publicId">): Promise<PartnerIssueRecord> {
    const row: PartnerIssueRecord = {
      ...input,
      id: crypto.randomUUID(),
      publicId: createPublicId("pis"),
    };
    this.issues.push(row);
    return row;
  }

  async getIssueByIdempotency(partnerId: string, key: string): Promise<PartnerIssueRecord | null> {
    return this.issues.find((row) => row.partnerId === partnerId && row.idempotencyKey === key) ?? null;
  }

  async getIssueById(id: string): Promise<PartnerIssueRecord | null> {
    return this.issues.find((row) => row.id === id) ?? null;
  }

  async listIssues(partnerId: string): Promise<PartnerIssueRecord[]> {
    return this.issues.filter((row) => row.partnerId === partnerId);
  }
}

export type { PartnerRole };
