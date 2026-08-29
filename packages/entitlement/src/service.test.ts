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
    expect(result.license.keyHash).toBe(hashLicenseKey(result.licenseKey ?? ""));
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
      billingIntervalSnapshot: "month",
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
      createdAt: NOW,
      updatedAt: NOW,
    };
    const subscription = {
      id: "sub-1",
      publicId: "sub_1",
      customerId: customer.id,
      planId: item.planId,
      productId: item.productId,
      priceId: item.priceId,
      provider: "mock",
      providerSubscriptionId: payment.providerPaymentId,
      status: "active" as const,
      currentPeriodStart: NOW,
      currentPeriodEnd: new Date("2026-09-29T12:00:00.000Z"),
      createdAt: NOW,
      updatedAt: NOW,
    };

    await hooks.afterPaid({
      order,
      items: [item],
      customer,
      payment,
      subscriptions: [subscription],
    });
    expect(store.entitlements[0]?.source).toBe("subscription");
    expect(store.entitlements[0]?.expiresAt).toEqual(subscription.currentPeriodEnd);

    await hooks.afterRefunded({
      order: { ...order, status: "refunded" },
      items: [item],
      customer,
      payment: { ...payment, status: "refunded" },
      full: true,
    });
    expect(store.entitlements).toHaveLength(1);
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
      order: {
        id: "ord-1",
        publicId: "ord_1",
        customerId: "cus-1",
        status: "partially_refunded",
        currency: "USD",
        totalMinor: 19900n,
        createdAt: NOW,
        updatedAt: NOW,
      },
      items: [
        {
          id: "item-1",
          orderId: "ord-1",
          productId: "prod-1",
          planId: "plan-1",
          priceId: null,
          quantity: 1,
          unitAmountMinor: 19900n,
          currency: "USD",
          productNameSnapshot: "Sample",
          planNameSnapshot: "Life",
          billingIntervalSnapshot: null,
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
        id: "pay-1",
        publicId: "pay_1",
        orderId: "ord-1",
        provider: "mock",
        providerPaymentId: "x",
        status: "succeeded",
        amountMinor: 19900n,
        currency: "USD",
        createdAt: NOW,
        updatedAt: NOW,
      },
      full: false,
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
