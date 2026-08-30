import { describe, expect, it } from "vitest";
import type { AuditService } from "@khepree/db";
import { createPublicId } from "@khepree/db";
import { MemoryCatalogReader } from "@khepree/entitlement";
import { createEntitlementService } from "@khepree/entitlement";
import { MemoryEntitlementRepository } from "@khepree/entitlement";
import type { CatalogSnapshot } from "@khepree/entitlement";
import type { PaidOrderContext, RefundedOrderContext } from "@khepree/commerce";
import { signedLedgerDelta } from "./ledger";
import { hashVisitorId } from "./privacy";
import { PartnerError } from "./errors";
import { createPartnerService } from "./service";
import { MemoryPartnerRepository } from "./store";
import type { PlanCatalog, PartnerMode, UserDirectory } from "./types";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const PARTNER_A = "11111111-1111-4111-8111-111111111111";
const PARTNER_B = "22222222-2222-4222-8222-222222222222";
const PLAN_ID = "plan-1";
const PRODUCT_ID = "prod-1";

const snapshot: CatalogSnapshot = {
  productId: PRODUCT_ID,
  productSlug: "sample",
  planId: PLAN_ID,
  planSlug: "sample-pro",
  licensingMode: "LICENSE_KEY_DEVICE",
  accessTermDays: 365,
  features: [{ key: "api_access", value: { valueType: "boolean", booleanValue: true } }],
};

class MemoryUsers implements UserDirectory {
  constructor(private readonly users: Array<{ id: string; email: string; name: string }>) {}
  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.users.find((row) => row.email.toLowerCase() === normalized) ?? null;
  }
  async getById(id: string) {
    return this.users.find((row) => row.id === id) ?? null;
  }
}

const catalog: PlanCatalog = {
  async getPlan(planId) {
    if (planId !== PLAN_ID) return null;
    return {
      id: PLAN_ID,
      slug: "sample-pro",
      productId: PRODUCT_ID,
      productSlug: "sample",
      billingType: "recurring",
    };
  },
};

function recordingAudit() {
  const records: Array<{ action: string }> = [];
  const audit: AuditService = {
    async record(input) {
      records.push({ action: input.action });
    },
  };
  return { audit, records };
}

function partnerRow(id: string, extra: Partial<Parameters<MemoryPartnerRepository["insertPartner"]>[0]> = {}) {
  return {
    id,
    publicId: createPublicId("ptr"),
    slug: id === PARTNER_A ? "alpha" : "beta",
    name: id === PARTNER_A ? "Alpha" : "Beta",
    tierId: null,
    status: "active" as const,
    modes: ["REFERRAL", "RESELLER"] as PartnerMode[],
    allowNegativeBalance: false,
    commissionBps: 1000,
    ...extra,
  };
}

async function setup(options: { allowNegative?: boolean } = {}) {
  const store = new MemoryPartnerRepository(() => NOW);
  const entitlementStore = new MemoryEntitlementRepository(() => NOW);
  const { audit } = recordingAudit();
  const entitlement = createEntitlementService({
    store: entitlementStore,
    catalog: new MemoryCatalogReader(new Map([[PLAN_ID, snapshot]])),
    audit,
    now: () => NOW,
  });
  await store.insertPartner(
    partnerRow(PARTNER_A, { allowNegativeBalance: options.allowNegative ?? false }),
  );
  await store.insertPartner(partnerRow(PARTNER_B));
  await store.insertMembership({ partnerId: PARTNER_A, userId: "owner-a", role: "PARTNER_OWNER" });
  await store.insertMembership({ partnerId: PARTNER_A, userId: "sales-a", role: "PARTNER_SALES" });
  await store.insertMembership({ partnerId: PARTNER_B, userId: "owner-b", role: "PARTNER_OWNER" });
  await store.getOrCreateWallet(PARTNER_A, "USD");
  await store.getOrCreateWallet(PARTNER_B, "USD");
  await store.insertPartnerPrice({
    partnerId: PARTNER_A,
    planId: PLAN_ID,
    amountMinor: 1000n,
    currency: "USD",
  });
  const users = new MemoryUsers([
    { id: "owner-a", email: "a@example.com", name: "Owner A" },
    { id: "sales-a", email: "sales-a@example.com", name: "Sales A" },
    { id: "owner-b", email: "b@example.com", name: "Owner B" },
    { id: "cust-1", email: "cust@example.com", name: "Customer" },
    { id: "cust-b", email: "cust-b@example.com", name: "Customer B" },
  ]);
  const service = createPartnerService({
    store,
    entitlement,
    users,
    catalog,
    audit,
    now: () => NOW,
    referralBaseUrl: "http://localhost:3000/en",
  });
  return { service, store, entitlementStore, entitlement };
}

describe("signedLedgerDelta", () => {
  it("credits positive and debits negative", () => {
    expect(signedLedgerDelta("CREDIT", 100n)).toBe(100n);
    expect(signedLedgerDelta("DEBIT", 40n)).toBe(-40n);
    expect(signedLedgerDelta("REFUND", 10n)).toBe(10n);
    expect(signedLedgerDelta("REVERSAL", 10n)).toBe(-10n);
    expect(signedLedgerDelta("ADJUSTMENT", 5n, true)).toBe(-5n);
  });

  it("rejects negative amounts", () => {
    expect(() => signedLedgerDelta("CREDIT", -1n)).toThrow(PartnerError);
  });
});

describe("partner ledger", () => {
  it("records history, keeps cache equal to the signed sum, and is idempotent", async () => {
    const { service, store } = await setup();
    await service.postLedger({
      partnerId: PARTNER_A,
      type: "CREDIT",
      amountMinor: 5000n,
      idempotencyKey: "topup-1",
      privileged: true,
    });
    const again = await service.postLedger({
      partnerId: PARTNER_A,
      type: "CREDIT",
      amountMinor: 5000n,
      idempotencyKey: "topup-1",
      privileged: true,
    });
    expect(again.replayed).toBe(true);
    await service.postLedger({
      partnerId: PARTNER_A,
      type: "DEBIT",
      amountMinor: 1500n,
      idempotencyKey: "spend-1",
      privileged: true,
    });
    const wallet = await store.getWalletByPartner(PARTNER_A);
    const txs = await store.listWalletTx(wallet!.id);
    const signed = txs.reduce(
      (sum, tx) => sum + signedLedgerDelta(tx.type, tx.amountMinor),
      0n,
    );
    expect(txs).toHaveLength(2);
    expect(wallet?.balanceMinor).toBe(3500n);
    expect(wallet?.balanceMinor).toBe(signed);
  });

  it("rejects a debit that would go negative unless credit policy allows it", async () => {
    const { service } = await setup();
    await expect(
      service.postLedger({
        partnerId: PARTNER_A,
        type: "DEBIT",
        amountMinor: 1n,
        idempotencyKey: "overdraw",
        privileged: true,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });

    const allowed = await setup({ allowNegative: true });
    const result = await allowed.service.postLedger({
      partnerId: PARTNER_A,
      type: "DEBIT",
      amountMinor: 1n,
      idempotencyKey: "overdraw-ok",
      privileged: true,
    });
    expect(result.wallet.balanceMinor).toBe(-1n);
  });

  it("serializes concurrent debits on one wallet", async () => {
    const { service, store } = await setup();
    await service.postLedger({
      partnerId: PARTNER_A,
      type: "CREDIT",
      amountMinor: 100n,
      idempotencyKey: "seed",
      privileged: true,
    });
    const results = await Promise.allSettled([
      service.postLedger({
        partnerId: PARTNER_A,
        type: "DEBIT",
        amountMinor: 80n,
        idempotencyKey: "d1",
        privileged: true,
      }),
      service.postLedger({
        partnerId: PARTNER_A,
        type: "DEBIT",
        amountMinor: 80n,
        idempotencyKey: "d2",
        privileged: true,
      }),
    ]);
    const ok = results.filter((row) => row.status === "fulfilled");
    const failed = results.filter((row) => row.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    const wallet = await store.getWalletByPartner(PARTNER_A);
    expect(wallet?.balanceMinor).toBe(20n);
  });

  it("requires a reason for privileged wallet adjustments", async () => {
    const { service } = await setup();
    await expect(
      service.postLedger({
        partnerId: PARTNER_A,
        type: "ADJUSTMENT",
        amountMinor: 50n,
        idempotencyKey: "adj-1",
        privileged: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    const result = await service.postLedger({
      partnerId: PARTNER_A,
      type: "ADJUSTMENT",
      amountMinor: 50n,
      idempotencyKey: "adj-1",
      privileged: true,
      reason: "goodwill correction",
      actorUserId: "finance-1",
    });
    expect(result.wallet.balanceMinor).toBe(50n);
  });
});

describe("partner scope", () => {
  it("blocks horizontal access from partner A to partner B", async () => {
    const { service, store } = await setup();
    await store.insertCustomer({ partnerId: PARTNER_B, userId: "cust-b" });
    await expect(service.listCustomers("owner-a", PARTNER_B)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.listWallet("owner-a", PARTNER_B)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.listCommissions("owner-a", PARTNER_B)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const visible = await service.listCustomers("owner-a", PARTNER_A);
    expect(visible).toEqual([]);
  });

  it("lets sales view but not manage team", async () => {
    const { service } = await setup();
    await expect(service.listTeam("sales-a", PARTNER_A)).resolves.toHaveLength(2);
    await expect(
      service.addMember({
        actorUserId: "sales-a",
        partnerId: PARTNER_A,
        email: "cust@example.com",
        role: "PARTNER_SALES",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not let a partner credit their own wallet", async () => {
    const { service } = await setup();
    await expect(
      service.postLedger({
        partnerId: PARTNER_A,
        type: "CREDIT",
        amountMinor: 10n,
        idempotencyKey: "self-credit",
        actorUserId: "owner-a",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("referral attribution", () => {
  it("stores hashed clicks and keeps first-touch signup", async () => {
    const { service, store } = await setup();
    const code = await service.createReferral({ actorUserId: "owner-a", partnerId: PARTNER_A });
    await service.recordClick({ code: code.code, visitorId: "visitor-raw" });
    const clicks = store.attributions.filter((row) => row.kind === "click");
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.visitorHash).toBe(hashVisitorId("visitor-raw"));
    expect(clicks[0]?.visitorHash).not.toContain("visitor-raw");

    const first = await service.attributeSignup({ userId: "cust-1", code: code.code });
    expect(first.replayed).toBe(false);
    const other = await store.insertReferral({ partnerId: PARTNER_B, code: "OTHERCODE" });
    const second = await service.attributeSignup({ userId: "cust-1", code: other.code });
    expect(second.replayed).toBe(true);
    expect(second.attribution.partnerId).toBe(PARTNER_A);
  });

  it("creates commission only when a signup attribution exists, then reverses on full refund", async () => {
    const { service, store } = await setup();
    const code = await service.createReferral({ actorUserId: "owner-a", partnerId: PARTNER_A });
    await service.attributeSignup({ userId: "buyer", code: code.code });
    const paid = paidOrder("ord-1", "buyer", 10000n);
    await service.onPaidOrder(paid);
    const commissions = await store.listCommissions(PARTNER_A);
    expect(commissions).toHaveLength(1);
    expect(commissions[0]?.amountMinor).toBe(1000n);
    expect(commissions[0]?.status).toBe("pending");

    await service.approveCommission({ commissionId: commissions[0]!.id });
    await service.releaseCommission({ commissionId: commissions[0]!.id });
    await service.payCommission({ commissionId: commissions[0]!.id });
    const wallet = await store.getWalletByPartner(PARTNER_A);
    expect(wallet?.balanceMinor).toBe(1000n);

    await service.onRefunded(refundedOrder(paid, true));
    const reversed = await store.getCommissionById(commissions[0]!.id);
    expect(reversed?.status).toBe("reversed");
    const after = await store.getWalletByPartner(PARTNER_A);
    expect(after?.balanceMinor).toBe(0n);
  });

  it("does not commission an unattributed checkout", async () => {
    const { service, store } = await setup();
    await service.onPaidOrder(paidOrder("ord-2", "stranger", 10000n));
    expect(await store.listCommissions(PARTNER_A)).toHaveLength(0);
  });
});

describe("reseller issue", () => {
  it("grants through entitlement and never inserts the entitlement table from the partner store", async () => {
    const { service, store, entitlementStore } = await setup();
    await service.postLedger({
      partnerId: PARTNER_A,
      type: "CREDIT",
      amountMinor: 5000n,
      idempotencyKey: "float",
      privileged: true,
    });
    await service.addCustomer({ actorUserId: "owner-a", partnerId: PARTNER_A, email: "cust@example.com" });
    const result = await service.issueProduct({
      actorUserId: "owner-a",
      partnerId: PARTNER_A,
      customerUserId: "cust-1",
      planId: PLAN_ID,
      idempotencyKey: "issue-1",
    });
    expect(result.replayed).toBe(false);
    expect(entitlementStore.entitlements).toHaveLength(1);
    expect(entitlementStore.entitlements[0]?.source).toBe("reseller");
    expect(entitlementStore.entitlements[0]?.id).toBe(result.issue.entitlementId);
    expect(store.issues).toHaveLength(1);

    const replay = await service.issueProduct({
      actorUserId: "owner-a",
      partnerId: PARTNER_A,
      customerUserId: "cust-1",
      planId: PLAN_ID,
      idempotencyKey: "issue-1",
    });
    expect(replay.replayed).toBe(true);
    expect(entitlementStore.entitlements).toHaveLength(1);
  });

  it("rejects issuing for another partner's customer", async () => {
    const { service, store } = await setup();
    await store.insertCustomer({ partnerId: PARTNER_B, userId: "cust-b" });
    await service.postLedger({
      partnerId: PARTNER_A,
      type: "CREDIT",
      amountMinor: 5000n,
      idempotencyKey: "float",
      privileged: true,
    });
    await expect(
      service.issueProduct({
        actorUserId: "owner-a",
        partnerId: PARTNER_A,
        customerUserId: "cust-b",
        planId: PLAN_ID,
        idempotencyKey: "steal",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(store.issues).toHaveLength(0);
  });

  it("renews expiration through the entitlement service", async () => {
    const { service, entitlement } = await setup();
    await service.postLedger({
      partnerId: PARTNER_A,
      type: "CREDIT",
      amountMinor: 5000n,
      idempotencyKey: "float",
      privileged: true,
    });
    await service.addCustomer({ actorUserId: "owner-a", partnerId: PARTNER_A, email: "cust@example.com" });
    const issued = await service.issueProduct({
      actorUserId: "owner-a",
      partnerId: PARTNER_A,
      customerUserId: "cust-1",
      planId: PLAN_ID,
      idempotencyKey: "issue-1",
    });
    const first = await entitlement.getEntitlement(issued.issue.entitlementId);
    const firstExpiry = first?.expiresAt?.getTime() ?? 0;
    await service.renewIssue({
      actorUserId: "owner-a",
      partnerId: PARTNER_A,
      issueId: issued.issue.id,
      idempotencyKey: "renew-1",
    });
    const renewed = await entitlement.getEntitlement(issued.issue.entitlementId);
    expect(renewed?.expiresAt?.getTime()).toBeGreaterThan(firstExpiry);
  });
});

function paidOrder(orderId: string, userId: string, totalMinor: bigint): PaidOrderContext {
  return {
    order: {
      id: orderId,
      publicId: `ord_${orderId}`,
      customerId: "cus-1",
      status: "paid",
      currency: "USD",
      totalMinor,
      createdAt: NOW,
      updatedAt: NOW,
    },
    items: [],
    customer: {
      id: "cus-1",
      publicId: "cus_1",
      userId,
      organizationId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    payment: {
      id: "pay-1",
      publicId: "pay_1",
      orderId,
      provider: "mock",
      providerPaymentId: "mock_1",
      status: "succeeded",
      amountMinor: totalMinor,
      currency: "USD",
      method: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    subscriptions: [],
  };
}

function refundedOrder(paid: PaidOrderContext, full: boolean): RefundedOrderContext {
  return {
    order: paid.order,
    items: paid.items,
    customer: paid.customer,
    payment: paid.payment,
    full,
  };
}
