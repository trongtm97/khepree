import {
  createDrizzleAuditService,
  getDb,
  type AuditService,
  type Database,
  type PartnerMode,
} from "@khepree/db";
import type { PaidOrderContext, RefundedOrderContext } from "@khepree/commerce";
import type { EntitlementService } from "@khepree/entitlement";
import { hasPermission, type Permission } from "@khepree/security";
import type { PartnerRole } from "@khepree/types";
import { DrizzlePartnerRepository, DrizzlePlanCatalog, DrizzleUserDirectory } from "./drizzle-store";
import { PartnerError } from "./errors";
import { signedLedgerDelta } from "./ledger";
import { hashVisitorId, newReferralCode } from "./privacy";
import type { PartnerRepository } from "./store";
import {
  hasMode,
  type PlanCatalog,
  type PartnerRecord,
  type PartnerStatus,
  type UserDirectory,
  type WalletTxType,
} from "./types";

const RECURRING_TERM_MS = 30 * 24 * 60 * 60 * 1000;

export interface PartnerActor {
  partner: PartnerRecord;
  role: PartnerRole;
}

export interface PartnerServiceOptions {
  store: PartnerRepository;
  entitlement: EntitlementService;
  users: UserDirectory;
  catalog: PlanCatalog;
  audit?: AuditService;
  now?: () => Date;
  referralBaseUrl?: string;
}

export class PartnerService {
  private readonly now: () => Date;

  constructor(private readonly options: PartnerServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async resolveForUser(userId: string): Promise<PartnerActor | null> {
    const memberships = await this.options.store.listMembershipsForUser(userId);
    const first = memberships[0];
    if (!first) return null;
    const partner = await this.options.store.getPartnerById(first.partnerId);
    if (!partner) return null;
    return { partner, role: first.role };
  }

  async assertMember(actorUserId: string, partnerId: string, permission: Permission = "partner.access"): Promise<PartnerActor> {
    const membership = await this.options.store.getMembership(partnerId, actorUserId);
    if (!membership) {
      throw new PartnerError("FORBIDDEN", "Not a member of this partner");
    }
    if (!hasPermission({ partnerRole: membership.role }, permission)) {
      throw new PartnerError("FORBIDDEN", "Insufficient partner role");
    }
    const partner = await this.options.store.getPartnerById(partnerId);
    if (!partner) throw new PartnerError("NOT_FOUND", "Partner not found");
    return { partner, role: membership.role };
  }

  async overview(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const [customers, issues, wallet, commissions, referrals, attributions] = await Promise.all([
      this.options.store.listCustomers(partnerId),
      this.options.store.listIssues(partnerId),
      this.options.store.getWalletByPartner(partnerId),
      this.options.store.listCommissions(partnerId),
      this.options.store.listReferrals(partnerId),
      this.options.store.listAttributions(partnerId),
    ]);
    let activeLicenses = 0;
    for (const issue of issues) {
      const entitlement = await this.options.entitlement.getEntitlement(issue.entitlementId);
      if (entitlement?.status === "active") activeLicenses += 1;
    }
    return {
      customerCount: customers.length,
      issueCount: issues.length,
      activeLicenseCount: activeLicenses,
      walletBalanceMinor: wallet?.balanceMinor ?? 0n,
      walletCurrency: wallet?.currency ?? "USD",
      pendingCommissionCount: commissions.filter((row) => row.status === "pending").length,
      availableCommissionMinor: commissions
        .filter((row) => row.status === "available")
        .reduce((sum, row) => sum + row.amountMinor, 0n),
      referralCodeCount: referrals.length,
      clickCount: attributions.filter((row) => row.kind === "click").length,
      signupCount: attributions.filter((row) => row.kind === "signup").length,
    };
  }

  async listCustomers(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const rows = await this.options.store.listCustomers(partnerId);
    return Promise.all(
      rows.map(async (row) => {
        const user = await this.options.users.getById(row.userId);
        return { ...row, email: user?.email ?? null, name: user?.name ?? null };
      }),
    );
  }

  async addCustomer(input: { actorUserId: string; partnerId: string; email: string }) {
    const { partner } = await this.assertMember(input.actorUserId, input.partnerId);
    this.assertActive(partner);
    this.assertMode(partner, "RESELLER");
    const user = await this.options.users.findByEmail(input.email);
    if (!user) throw new PartnerError("NOT_FOUND", "No account exists for that email");
    const existing = await this.options.store.getCustomer(input.partnerId, user.id);
    if (existing) return existing;
    return this.options.store.insertCustomer({ partnerId: input.partnerId, userId: user.id });
  }

  async listProducts(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const prices = await this.options.store.listPartnerPrices(partnerId);
    return Promise.all(
      prices.map(async (price) => {
        const plan = await this.options.catalog.getPlan(price.planId);
        return { ...price, plan };
      }),
    );
  }

  async listIssues(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const issues = await this.options.store.listIssues(partnerId);
    return Promise.all(
      issues.map(async (issue) => {
        const entitlement = await this.options.entitlement.getEntitlement(issue.entitlementId);
        return { issue, entitlement };
      }),
    );
  }

  async listWallet(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const wallet = await this.options.store.getOrCreateWallet(partnerId, "USD");
    const transactions = await this.options.store.listWalletTx(wallet.id);
    return { wallet, transactions };
  }

  async listCommissions(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    return this.options.store.listCommissions(partnerId);
  }

  async listReferrals(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const codes = await this.options.store.listReferrals(partnerId);
    const attributions = await this.options.store.listAttributions(partnerId);
    const base = this.options.referralBaseUrl?.replace(/\/$/, "") ?? "";
    return codes.map((code) => {
      const rows = attributions.filter((row) => row.referralId === code.id);
      return {
        ...code,
        link: base ? `${base}/r/${code.code}` : `/r/${code.code}`,
        clicks: rows.filter((row) => row.kind === "click").length,
        signups: rows.filter((row) => row.kind === "signup").length,
        orders: rows.filter((row) => row.kind === "order").length,
      };
    });
  }

  async listTeam(actorUserId: string, partnerId: string) {
    await this.assertMember(actorUserId, partnerId);
    const rows = await this.options.store.listMemberships(partnerId);
    return Promise.all(
      rows.map(async (row) => {
        const user = await this.options.users.getById(row.userId);
        return { ...row, email: user?.email ?? null, name: user?.name ?? null };
      }),
    );
  }

  async addMember(input: {
    actorUserId: string;
    partnerId: string;
    email: string;
    role: PartnerRole;
  }) {
    await this.assertMember(input.actorUserId, input.partnerId, "partner.manage");
    const user = await this.options.users.findByEmail(input.email);
    if (!user) throw new PartnerError("NOT_FOUND", "No account exists for that email");
    const existing = await this.options.store.getMembership(input.partnerId, user.id);
    if (existing) return existing;
    return this.options.store.insertMembership({
      partnerId: input.partnerId,
      userId: user.id,
      role: input.role,
    });
  }

  async updateSettings(input: { actorUserId: string; partnerId: string; name: string }) {
    await this.assertMember(input.actorUserId, input.partnerId, "partner.manage");
    const name = input.name.trim();
    if (!name) throw new PartnerError("INVALID_AMOUNT", "Name is required");
    return this.options.store.updatePartner(input.partnerId, { name });
  }

  async createReferral(input: { actorUserId: string; partnerId: string; label?: string | null }) {
    const { partner } = await this.assertMember(input.actorUserId, input.partnerId);
    this.assertActive(partner);
    this.assertMode(partner, "REFERRAL");
    return this.options.store.insertReferral({
      partnerId: input.partnerId,
      code: newReferralCode(),
      label: input.label ?? null,
    });
  }

  async recordClick(input: { code: string; visitorId: string }) {
    const referral = await this.options.store.getReferralByCode(input.code);
    if (!referral) throw new PartnerError("NOT_FOUND", "Referral code not found");
    const visitorHash = hashVisitorId(input.visitorId);
    await this.options.store.insertAttribution({
      partnerId: referral.partnerId,
      referralId: referral.id,
      kind: "click",
      visitorHash,
      userId: null,
      orderId: null,
    });
    return { partnerId: referral.partnerId, code: referral.code };
  }

  async attributeSignup(input: { userId: string; code: string }) {
    const existing = await this.options.store.getSignupAttribution(input.userId);
    if (existing) return { attribution: existing, replayed: true as const };
    const referral = await this.options.store.getReferralByCode(input.code);
    if (!referral) throw new PartnerError("NOT_FOUND", "Referral code not found");
    const result = await this.options.store.insertAttribution({
      partnerId: referral.partnerId,
      referralId: referral.id,
      kind: "signup",
      visitorHash: null,
      userId: input.userId,
      orderId: null,
    });
    if (result === "duplicate") {
      const again = await this.options.store.getSignupAttribution(input.userId);
      if (again) return { attribution: again, replayed: true as const };
      throw new PartnerError("CONFLICT", "Signup already attributed");
    }
    return { attribution: result, replayed: false as const };
  }

  async onPaidOrder(ctx: PaidOrderContext): Promise<void> {
    const userId = ctx.customer.userId;
    if (!userId) return;
    const signup = await this.options.store.getSignupAttribution(userId);
    if (!signup) return;
    const partner = await this.options.store.getPartnerById(signup.partnerId);
    if (!partner || partner.status !== "active") return;

    await this.options.store.insertAttribution({
      partnerId: signup.partnerId,
      referralId: signup.referralId,
      kind: "order",
      visitorHash: null,
      userId,
      orderId: ctx.order.id,
    });

    const existing = await this.options.store.getCommissionByOrder(signup.partnerId, ctx.order.id);
    if (existing) return;
    if (partner.commissionBps <= 0) return;
    const amountMinor = (ctx.order.totalMinor * BigInt(partner.commissionBps)) / 10000n;
    if (amountMinor <= 0n) return;
    await this.options.store.insertCommission({
      partnerId: signup.partnerId,
      orderId: ctx.order.id,
      amountMinor,
      currency: ctx.order.currency,
      status: "pending",
    });
  }

  async onRefunded(ctx: RefundedOrderContext): Promise<void> {
    if (!ctx.full) return;
    const attribution = await this.options.store.getOrderAttribution(ctx.order.id);
    if (!attribution) return;
    const commission = await this.options.store.getCommissionByOrder(attribution.partnerId, ctx.order.id);
    if (!commission) return;
    await this.reverseCommission({ commissionId: commission.id });
  }

  async approveCommission(input: { commissionId: string; actorUserId?: string | null }) {
    const row = await this.requireCommission(input.commissionId);
    if (row.status === "approved" || row.status === "available" || row.status === "paid") return row;
    if (row.status !== "pending") {
      throw new PartnerError("CONFLICT", `Cannot approve commission in status ${row.status}`);
    }
    const updated = await this.options.store.updateCommissionStatus(row.id, "approved");
    await this.audit("commission.approved", updated.publicId, input.actorUserId);
    return updated;
  }

  async releaseCommission(input: { commissionId: string; actorUserId?: string | null }) {
    const row = await this.requireCommission(input.commissionId);
    if (row.status === "available" || row.status === "paid") return row;
    if (row.status !== "approved") {
      throw new PartnerError("CONFLICT", `Cannot release commission in status ${row.status}`);
    }
    const updated = await this.options.store.updateCommissionStatus(row.id, "available");
    await this.audit("commission.available", updated.publicId, input.actorUserId);
    return updated;
  }

  async payCommission(input: { commissionId: string; actorUserId?: string | null }) {
    const row = await this.requireCommission(input.commissionId);
    if (row.status === "paid") return row;
    if (row.status !== "available") {
      throw new PartnerError("CONFLICT", `Cannot pay commission in status ${row.status}`);
    }
    await this.postLedger({
      partnerId: row.partnerId,
      type: "CREDIT",
      amountMinor: row.amountMinor,
      idempotencyKey: `commission-pay:${row.id}`,
      referenceType: "commission",
      referenceId: row.id,
      privileged: true,
    });
    const updated = await this.options.store.updateCommissionStatus(row.id, "paid");
    await this.audit("commission.paid", updated.publicId, input.actorUserId);
    return updated;
  }

  async reverseCommission(input: { commissionId: string; actorUserId?: string | null }) {
    const row = await this.requireCommission(input.commissionId);
    if (row.status === "reversed") return row;
    if (row.status === "paid") {
      await this.postLedger({
        partnerId: row.partnerId,
        type: "REVERSAL",
        amountMinor: row.amountMinor,
        idempotencyKey: `commission-reverse:${row.id}`,
        referenceType: "commission",
        referenceId: row.id,
        privileged: true,
      });
    }
    const updated = await this.options.store.updateCommissionStatus(row.id, "reversed");
    await this.audit("commission.reversed", updated.publicId, input.actorUserId);
    return updated;
  }

  async setPartnerStatus(input: {
    partnerId: string;
    status: PartnerStatus;
    actorUserId?: string | null;
  }) {
    const updated = await this.options.store.updatePartner(input.partnerId, { status: input.status });
    await this.audit("partner.status", updated.publicId, input.actorUserId, { status: input.status });
    return updated;
  }

  async setPartnerTier(input: {
    partnerId: string;
    tierId: string | null;
    actorUserId?: string | null;
  }) {
    const updated = await this.options.store.updatePartner(input.partnerId, { tierId: input.tierId });
    await this.audit("partner.tier", updated.publicId, input.actorUserId, { tierId: input.tierId });
    return updated;
  }

  async setPartnerPrice(input: {
    partnerId: string;
    planId: string;
    amountMinor: bigint;
    currency: string;
    actorUserId?: string | null;
  }) {
    const row = {
      partnerId: input.partnerId,
      planId: input.planId,
      amountMinor: input.amountMinor,
      currency: input.currency,
    };
    const existing = await this.options.store.getPartnerPrice(input.partnerId, input.planId);
    const saved = existing
      ? await this.options.store.updatePartnerPrice(row)
      : await this.options.store.insertPartnerPrice(row);
    const partner = await this.options.store.getPartnerById(input.partnerId);
    await this.audit("partner.price", partner?.publicId ?? input.partnerId, input.actorUserId, {
      planId: input.planId,
      amountMinor: input.amountMinor.toString(),
      currency: input.currency,
    });
    return saved;
  }

  async postLedger(input: {
    partnerId: string;
    type: WalletTxType;
    amountMinor: bigint;
    idempotencyKey: string;
    referenceType?: string | null;
    referenceId?: string | null;
    adjustmentNegative?: boolean;
    privileged?: boolean;
    actorUserId?: string;
    reason?: string;
  }) {
    if (input.type === "ADJUSTMENT") {
      const reason = input.reason?.trim() ?? "";
      if (reason.length < 3) {
        throw new PartnerError("INVALID_INPUT", "Reason is required for wallet adjustments");
      }
    }
    if (!input.privileged && input.actorUserId) {
      await this.assertMember(input.actorUserId, input.partnerId);
      if (input.type !== "DEBIT") {
        throw new PartnerError("FORBIDDEN", "Partners cannot credit their own wallet");
      }
    }
    const partner = await this.options.store.getPartnerById(input.partnerId);
    if (!partner) throw new PartnerError("NOT_FOUND", "Partner not found");
    const wallet = await this.options.store.getOrCreateWallet(input.partnerId, "USD");
    const result = await this.options.store.withWalletLock(wallet.id, (repo) =>
      this.postLedgerOn(repo, partner, wallet.id, input),
    );
    if (input.privileged) {
      await this.audit("wallet.ledger", partner.publicId, input.actorUserId, {
        type: input.type,
        amountMinor: input.amountMinor.toString(),
        reason: input.reason ?? null,
        replayed: result.replayed,
      });
    }
    return result;
  }

  async issueProduct(input: {
    actorUserId: string;
    partnerId: string;
    customerUserId: string;
    planId: string;
    idempotencyKey: string;
  }) {
    const { partner } = await this.assertMember(input.actorUserId, input.partnerId);
    this.assertActive(partner);
    this.assertMode(partner, "RESELLER");
    const existing = await this.options.store.getIssueByIdempotency(input.partnerId, input.idempotencyKey);
    if (existing) return { issue: existing, replayed: true as const };
    const customer = await this.options.store.getCustomer(input.partnerId, input.customerUserId);
    if (!customer) throw new PartnerError("FORBIDDEN", "Customer is not in this partner scope");
    const price = await this.options.store.getPartnerPrice(input.partnerId, input.planId);
    if (!price) throw new PartnerError("NOT_FOUND", "No partner price for this plan");
    const plan = await this.options.catalog.getPlan(input.planId);
    if (!plan) throw new PartnerError("NOT_FOUND", "Plan not found");

    const debit = await this.postLedger({
      partnerId: input.partnerId,
      type: "DEBIT",
      amountMinor: price.amountMinor,
      idempotencyKey: `issue:${input.idempotencyKey}`,
      referenceType: "partner_issue",
      referenceId: input.idempotencyKey,
      privileged: true,
    });

    try {
      const granted = await this.options.entitlement.grantEntitlement({
        principal: { type: "USER", id: input.customerUserId },
        productId: plan.productId,
        planId: plan.id,
        source: "reseller",
        expiresAt: expiresAtForPlan(plan.billingType, this.now()),
        actorUserId: input.actorUserId,
        metadata: { partnerId: input.partnerId, issueKey: input.idempotencyKey },
      });
      const issue = await this.options.store.insertIssue({
        partnerId: input.partnerId,
        customerUserId: input.customerUserId,
        entitlementId: granted.entitlement.id,
        planId: plan.id,
        amountMinor: price.amountMinor,
        currency: price.currency,
        kind: "issue",
        idempotencyKey: input.idempotencyKey,
      });
      return { issue, replayed: false as const, debit };
    } catch (error) {
      await this.postLedger({
        partnerId: input.partnerId,
        type: "REFUND",
        amountMinor: price.amountMinor,
        idempotencyKey: `issue-rollback:${input.idempotencyKey}`,
        referenceType: "partner_issue",
        referenceId: input.idempotencyKey,
        privileged: true,
      });
      throw error;
    }
  }

  async renewIssue(input: { actorUserId: string; partnerId: string; issueId: string; idempotencyKey: string }) {
    const { partner } = await this.assertMember(input.actorUserId, input.partnerId);
    this.assertActive(partner);
    this.assertMode(partner, "RESELLER");
    const existing = await this.options.store.getIssueByIdempotency(input.partnerId, input.idempotencyKey);
    if (existing) return { issue: existing, replayed: true as const };
    const previous = await this.options.store.getIssueById(input.issueId);
    if (!previous || previous.partnerId !== input.partnerId) {
      throw new PartnerError("NOT_FOUND", "Issue not found");
    }
    const price = await this.options.store.getPartnerPrice(input.partnerId, previous.planId);
    if (!price) throw new PartnerError("NOT_FOUND", "No partner price for this plan");
    const plan = await this.options.catalog.getPlan(previous.planId);
    if (!plan) throw new PartnerError("NOT_FOUND", "Plan not found");
    const entitlement = await this.options.entitlement.getEntitlement(previous.entitlementId);
    if (!entitlement) throw new PartnerError("NOT_FOUND", "Entitlement not found");

    await this.postLedger({
      partnerId: input.partnerId,
      type: "DEBIT",
      amountMinor: price.amountMinor,
      idempotencyKey: `renew:${input.idempotencyKey}`,
      referenceType: "partner_issue",
      referenceId: input.idempotencyKey,
      privileged: true,
    });

    const base = entitlement.expiresAt && entitlement.expiresAt > this.now() ? entitlement.expiresAt : this.now();
    await this.options.entitlement.updateEntitlement({
      entitlementId: entitlement.id,
      expiresAt: expiresAtForPlan(plan.billingType, base) ?? null,
      actorUserId: input.actorUserId,
      metadata: { renewedByPartnerId: input.partnerId },
    });

    const issue = await this.options.store.insertIssue({
      partnerId: input.partnerId,
      customerUserId: previous.customerUserId,
      entitlementId: entitlement.id,
      planId: previous.planId,
      amountMinor: price.amountMinor,
      currency: price.currency,
      kind: "renew",
      idempotencyKey: input.idempotencyKey,
    });
    return { issue, replayed: false as const };
  }

  private async postLedgerOn(
    repo: PartnerRepository,
    partner: PartnerRecord,
    walletId: string,
    input: {
      type: WalletTxType;
      amountMinor: bigint;
      idempotencyKey: string;
      referenceType?: string | null;
      referenceId?: string | null;
      adjustmentNegative?: boolean;
    },
  ) {
    const replayed = await repo.getWalletTxByIdempotency(walletId, input.idempotencyKey);
    if (replayed) {
      const wallet = await repo.getWalletByPartner(partner.id);
      if (!wallet) throw new PartnerError("NOT_FOUND", "Wallet not found");
      return { tx: replayed, wallet, replayed: true as const };
    }
    const wallet = await repo.getWalletByPartner(partner.id);
    if (!wallet) throw new PartnerError("NOT_FOUND", "Wallet not found");
    const delta = signedLedgerDelta(input.type, input.amountMinor, input.adjustmentNegative);
    const next = wallet.balanceMinor + delta;
    if (next < 0n && !partner.allowNegativeBalance) {
      throw new PartnerError("INSUFFICIENT_FUNDS", "Wallet balance cannot go negative");
    }
    const tx = await repo.insertWalletTx({
      walletId,
      amountMinor: input.amountMinor,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
    });
    const updated = await repo.updateWalletBalance(walletId, next);
    return { tx, wallet: updated, replayed: false as const };
  }

  private async requireCommission(id: string) {
    const row = await this.options.store.getCommissionById(id);
    if (!row) throw new PartnerError("NOT_FOUND", "Commission not found");
    return row;
  }

  private assertActive(partner: PartnerRecord) {
    if (partner.status !== "active") {
      throw new PartnerError("NOT_ACTIVE", "Partner is not active");
    }
  }

  private assertMode(partner: PartnerRecord, mode: PartnerMode) {
    if (!hasMode(partner, mode)) {
      throw new PartnerError("MODE_REQUIRED", `Partner mode ${mode} is required`);
    }
  }

  private async audit(
    action: string,
    resourceId: string,
    actorUserId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    await this.options.audit?.record({
      actorUserId: actorUserId ?? null,
      action,
      resourceType: "partner",
      resourceId,
      metadata: metadata ?? null,
    });
  }
}

export function expiresAtForPlan(billingType: string, from: Date): Date | null {
  if (billingType === "recurring") {
    // ponytail: 30-day reseller term; upgrade: read the partner price interval
    return new Date(from.getTime() + RECURRING_TERM_MS);
  }
  return null;
}

export interface CreatePartnerServiceOverrides {
  db?: Database | null;
  store?: PartnerRepository;
  entitlement: EntitlementService;
  users?: UserDirectory;
  catalog?: PlanCatalog;
  audit?: AuditService;
  now?: () => Date;
  referralBaseUrl?: string;
}

export function createPartnerService(overrides: CreatePartnerServiceOverrides): PartnerService {
  const db = overrides.store ? null : (overrides.db ?? getDb());
  const store = overrides.store ?? (db ? new DrizzlePartnerRepository(db) : null);
  if (!store) throw new PartnerError("NOT_CONFIGURED", "Database is not configured");
  const users = overrides.users ?? (db ? new DrizzleUserDirectory(db) : null);
  if (!users) throw new PartnerError("NOT_CONFIGURED", "User directory is not configured");
  const catalog = overrides.catalog ?? (db ? new DrizzlePlanCatalog(db) : null);
  if (!catalog) throw new PartnerError("NOT_CONFIGURED", "Plan catalog is not configured");
  const audit =
    overrides.audit ?? (db ? createDrizzleAuditService(db) : { record: async () => undefined });
  return new PartnerService({
    store,
    entitlement: overrides.entitlement,
    users,
    catalog,
    audit,
    now: overrides.now,
    referralBaseUrl: overrides.referralBaseUrl,
  });
}
