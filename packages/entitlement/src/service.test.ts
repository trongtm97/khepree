import { describe, expect, it } from "vitest";
import type { AuditService } from "@khepree/db";
import { MemoryCatalogReader } from "./catalog-reader";
import { createEntitlementCommerceHooks } from "./commerce-hooks";
import { hashLicenseKey } from "./keys";
import { createEntitlementService } from "./service";
import { MemoryEntitlementRepository } from "./store";
import type { CatalogSnapshot } from "./types";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const PRINCIPAL = { type: "USER" as const, id: "user_1" };

const snapshot: CatalogSnapshot = {
  productId: "prod-1",
  productSlug: "sample",
  planId: "plan-1",
  planSlug: "sample-pro",
  licensingMode: "LICENSE_KEY_DEVICE",
  accessTermDays: 365,
  features: [
    { key: "api_access", value: { valueType: "boolean", booleanValue: true } },
    { key: "devices.max", value: { valueType: "integer", integerValue: 2 } },
  ],
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

function createService() {
  const store = new MemoryEntitlementRepository(() => NOW);
  const { audit, records } = recordingAudit();
  const service = createEntitlementService({
    store,
    catalog: new MemoryCatalogReader(new Map([[snapshot.planId, snapshot]])),
    audit,
    now: () => NOW,
  });
  return { service, store, records };
}

describe("entitlement engine", () => {
  it("grants an entitlement with a hashed license key and a feature snapshot", async () => {
    const { service, store } = createService();
    const result = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "perpetual",
    });

    expect(result.entitlement.status).toBe("active");
    expect(result.licenseKey).toMatch(/^KHPR-[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/);
    expect(result.license?.keyHash).toBe(hashLicenseKey(result.licenseKey ?? ""));
    expect(store.entitlements).toHaveLength(1);
    expect(service.resolveFeaturesFor(result.entitlement).map((row) => row.key)).toContain(
      "devices.max",
    );
    await expect(service.canUseProduct(PRINCIPAL, "prod-1")).resolves.toBe(true);
  });

  it("is idempotent for the same order item and does not reissue the key", async () => {
    const { service, store } = createService();
    const first = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "subscription",
      orderPublicId: "ord_1",
      orderItemId: "item_1",
    });
    const second = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "subscription",
      orderPublicId: "ord_1",
      orderItemId: "item_1",
    });

    expect(store.entitlements).toHaveLength(1);
    expect(second.entitlement.id).toBe(first.entitlement.id);
    expect(second.licenseKey).toBeUndefined();
  });

  it("suspends on refund policy and never deletes the entitlement", async () => {
    const { service, store } = createService();
    const granted = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "perpetual",
      orderPublicId: "ord_1",
      orderItemId: "item_1",
    });
    await service.suspendEntitlement({ entitlementId: granted.entitlement.id, reason: "refund" });

    expect(store.entitlements).toHaveLength(1);
    expect(store.entitlements[0]?.status).toBe("suspended");
    expect(store.licenses[0]?.status).toBe("suspended");
    await expect(service.canUseProduct(PRINCIPAL, "prod-1")).resolves.toBe(false);
  });

  it("expires time-bounded entitlements", async () => {
    const { service, store } = createService();
    await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "trial",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    const count = await service.expireEntitlements();
    expect(count).toBe(1);
    expect(store.entitlements[0]?.status).toBe("expired");
    await expect(service.canUseProduct(PRINCIPAL, "prod-1")).resolves.toBe(false);
  });

  it("revokes without deleting", async () => {
    const { service, store, records } = createService();
    const granted = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "admin_grant",
    });
    await service.revokeEntitlement({ entitlementId: granted.entitlement.id, reason: "admin" });
    expect(store.entitlements[0]?.status).toBe("revoked");
    expect(store.entitlements[0]?.revokedAt).toEqual(NOW);
    expect(records.map((row) => row.action)).toContain("entitlement.revoked");
  });
});

describe("commerce entitlement hooks", () => {
  it("grants from a paid order and suspends on a full refund", async () => {
    const { service, store } = createService();
    const hooks = createEntitlementCommerceHooks(service);
    const customer = {
      id: "cus-1",
      publicId: "cus_1",
      userId: PRINCIPAL.id,
      organizationId: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const order = {
      id: "ord-1",
      publicId: "ord_1",
      customerId: customer.id,
      status: "paid" as const,
      currency: "USD",
      totalMinor: 1900n,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const item = {
      id: "item-1",
      orderId: order.id,
      productId: "prod-1",
      planId: "plan-1",
      priceId: "price-1",
      quantity: 1,
      unitAmountMinor: 1900n,
      currency: "USD",
      productNameSnapshot: "Sample",
      planNameSnapshot: "Pro",
      billingIntervalSnapshot: "year",
      accessTermDaysSnapshot: 365,
    };
    const payment = {
      id: "pay-1",
      publicId: "pay_1",
      orderId: order.id,
      provider: "mock",
      providerPaymentId: "mockpay_1",
      status: "succeeded" as const,
      amountMinor: 1900n,
      currency: "USD",
      method: null,
      providerSubscriptionId: null,
      createdAt: NOW,
      updatedAt: NOW,
    };

    await hooks.afterPaid({
      order: { publicId: order.publicId },
      items: [
        {
          id: item.id,
          productId: item.productId,
          planId: item.planId,
          accessTermDaysSnapshot: item.accessTermDaysSnapshot,
        },
      ],
      customer: { userId: customer.userId, organizationId: customer.organizationId },
      payment: { publicId: payment.publicId },
    });
    expect(store.entitlements[0]?.source).toBe("subscription");
    expect(store.entitlements[0]?.expiresAt).toEqual(new Date("2027-08-29T12:00:00.000Z"));

    await hooks.afterRefunded({
      full: true,
      customer: { userId: customer.userId, organizationId: customer.organizationId },
      items: [{ id: item.id }],
    });
    expect(store.entitlements).toHaveLength(1);
    expect(store.entitlements[0]?.status).toBe("suspended");
  });

  it("suspends entitlement exactly once on afterVoided", async () => {
    const { service, store } = createService();
    const hooks = createEntitlementCommerceHooks(service);
    const granted = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "perpetual",
      orderPublicId: "ord_void",
      orderItemId: "item-void",
    });
    const ctx = {
      order: {
        id: "ord-void",
        publicId: "ord_void",
        customerId: "cus-1",
        status: "voided" as const,
        currency: "VND",
        totalMinor: 599000n,
        createdAt: NOW,
        updatedAt: NOW,
      },
      items: [
        {
          id: "item-void",
          orderId: "ord-void",
          productId: "prod-1",
          planId: "plan-1",
          priceId: null,
          quantity: 1,
          unitAmountMinor: 599000n,
          currency: "VND",
          productNameSnapshot: "Sample",
          planNameSnapshot: "Pro",
          billingIntervalSnapshot: "year",
          accessTermDaysSnapshot: 365,
        },
      ],
      customer: {
        id: "cus-1",
        publicId: "cus_1",
        userId: PRINCIPAL.id,
        organizationId: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      payment: {
        id: "pay-void",
        publicId: "pay_void",
        orderId: "ord-void",
        provider: "sepay",
        providerPaymentId: "KHP_ord_void",
        status: "voided" as const,
        amountMinor: 599000n,
        currency: "VND",
        method: null,
        providerSubscriptionId: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      full: true as const,
    };
    await hooks.afterVoided({
      customer: { userId: ctx.customer.userId, organizationId: ctx.customer.organizationId },
      items: ctx.items.map((row) => ({ id: row.id })),
    });
    await hooks.afterVoided({
      customer: { userId: ctx.customer.userId, organizationId: ctx.customer.organizationId },
      items: ctx.items.map((row) => ({ id: row.id })),
    });
    expect(granted.entitlement.id).toBe(store.entitlements[0]?.id);
    expect(store.entitlements[0]?.status).toBe("suspended");
  });

  it("does not change entitlement on a partial refund", async () => {
    const { service, store } = createService();
    const hooks = createEntitlementCommerceHooks(service);
    await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "perpetual",
      orderPublicId: "ord_1",
      orderItemId: "item-1",
    });
    await hooks.afterRefunded({
      full: false,
      customer: { userId: PRINCIPAL.id, organizationId: null },
      items: [{ id: "item-1" }],
    });
    expect(store.entitlements[0]?.status).toBe("active");
  });

  it("requires a reason for complimentary grants and reissues the key via the service", async () => {
    const { service, store, records } = createService();
    await expect(
      service.grantComplimentary({
        principal: PRINCIPAL,
        productId: "prod-1",
        planId: "plan-1",
        source: "complimentary",
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    const granted = await service.grantComplimentary({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "complimentary",
      reason: "QA complimentary seat",
      actorUserId: "admin-1",
    });
    expect(granted.entitlement.metadata.reason).toBe("QA complimentary seat");
    expect(granted.licenseKey).toMatch(/^KHPR-/);

    const reissued = await service.reissueLicense({
      entitlementId: granted.entitlement.id,
      reason: "device fleet reset",
      actorUserId: "admin-1",
    });
    expect(reissued.licenseKey).toMatch(/^KHPR-/);
    expect(reissued.licenseKey).not.toBe(granted.licenseKey);
    expect(store.licenses[0]?.keyHash).toBe(hashLicenseKey(reissued.licenseKey ?? ""));
    expect(records.some((row) => row.action === "license.reissued")).toBe(true);
  });
});

describe("licensing mode and access term", () => {
  it("grants a web product entitlement without a license", async () => {
    const web: CatalogSnapshot = {
      ...snapshot,
      productId: "prod-web",
      productSlug: "web-app",
      planId: "plan-web",
      licensingMode: "ACCOUNT",
      accessTermDays: 365,
    };
    const store = new MemoryEntitlementRepository(() => NOW);
    const { audit } = recordingAudit();
    const service = createEntitlementService({
      store,
      catalog: new MemoryCatalogReader(new Map([[web.planId, web]])),
      audit,
      now: () => NOW,
    });
    const result = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-web",
      planId: "plan-web",
      source: "subscription",
    });
    expect(result.license).toBeNull();
    expect(result.licenseKey).toBeUndefined();
    expect(store.licenses).toHaveLength(0);
    expect(result.entitlement.expiresAt).toEqual(new Date("2027-08-29T12:00:00.000Z"));
  });

  it("still issues a license for LICENSE_KEY_DEVICE products", async () => {
    const { service, store } = createService();
    const result = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "perpetual",
    });
    expect(result.license).not.toBeNull();
    expect(result.licenseKey).toMatch(/^KHPR-/);
    expect(store.licenses).toHaveLength(1);
  });

  it("extends an active future expiry on renewal", async () => {
    const { service } = createService();
    const first = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "subscription",
    });
    const second = await service.grantEntitlement({
      principal: PRINCIPAL,
      productId: "prod-1",
      planId: "plan-1",
      source: "subscription",
    });
    expect(second.entitlement.id).toBe(first.entitlement.id);
    expect(second.entitlement.expiresAt).toEqual(new Date("2028-08-28T12:00:00.000Z"));
  });
});
