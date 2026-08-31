import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuditService } from "@khepree/db";
import { CommerceError } from "./errors";
import { assertOrderTransition, canTransitionOrder } from "./order-state";
import {
  MOCK_SIGNATURE_HEADER,
  MockDevelopmentPaymentProvider,
  signMockWebhook,
  type PaymentProvider,
} from "./provider";
import { SePayPaymentProvider } from "./sepay";
import { createCommerceService, type CommerceService } from "./service";
import { MemoryCommerceRepository } from "./store";
import type { CatalogReader, PurchasableOffer } from "./types";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const OWNER = { type: "user" as const, userId: "user_1" };

const recurringOffer: PurchasableOffer = {
  product: {
    id: "prod-1",
    publicId: "prod_sample",
    slug: "sample",
    name: "Sample",
    licensingMode: "LICENSE_KEY_DEVICE",
  },
  plan: {
    id: "plan-1",
    publicId: "plan_pro",
    slug: "sample-pro",
    name: "Pro",
    billingType: "one_time",
    accessTermDays: 365,
  },
  price: {
    id: "price-1",
    publicId: "price_sample_pro_vnd",
    currency: "VND",
    amountMinor: 599000n,
    interval: "year",
  },
};

const oneTimeOffer: PurchasableOffer = {
  ...recurringOffer,
  plan: {
    ...recurringOffer.plan,
    id: "plan-2",
    publicId: "plan_life",
    slug: "sample-lifetime",
    name: "Lifetime",
    billingType: "one_time",
    accessTermDays: null,
  },
  price: {
    id: "price-2",
    publicId: "price_sample_lifetime_vnd",
    currency: "VND",
    amountMinor: 499000n,
    interval: null,
  },
};

function recordingAudit() {
  const records: Array<{ action: string; resourceType: string }> = [];
  const audit: AuditService = {
    async record(input) {
      records.push({ action: input.action, resourceType: input.resourceType });
    },
  };
  return { audit, records };
}

function testCatalog(offer: PurchasableOffer = recurringOffer): CatalogReader {
  return {
    async getPurchasableOffer(planPublicId, pricePublicId) {
      if (planPublicId === offer.plan.publicId && pricePublicId === offer.price.publicId) {
        return offer;
      }
      return null;
    },
  };
}

function createTestCommerce(offer: PurchasableOffer = recurringOffer) {
  const store = new MemoryCommerceRepository(() => NOW);
  const { audit, records } = recordingAudit();
  const provider = new MockDevelopmentPaymentProvider({
    webhookSecret: "test-secret",
    hostedBaseUrl: "http://localhost:3001",
  });
  const commerce = createCommerceService({
    store,
    provider,
    catalog: testCatalog(offer),
    audit,
    now: () => NOW,
  });
  return { commerce, store, records, provider };
}

async function startCheckout(commerce: CommerceService, offer: PurchasableOffer = recurringOffer) {
  return commerce.createCheckoutIntent({
    owner: OWNER,
    planPublicId: offer.plan.publicId,
    pricePublicId: offer.price.publicId,
    locale: "en",
    successUrl: "http://localhost:3001/billing?checkout=processing",
    cancelUrl: "http://localhost:3001/checkout?cancelled=1",
    actorUserId: OWNER.userId,
  });
}

async function postWebhook(
  commerce: CommerceService,
  type: string,
  providerPaymentId: string,
  amountMinor: bigint,
  eventId: string,
  currency = "VND",
) {
  const rawBody = JSON.stringify({
    id: eventId,
    type,
    data: {
      providerPaymentId,
      amountMinor: amountMinor.toString(),
      currency,
    },
  });
  return commerce.processWebhook({
    providerId: "mock",
    headers: { [MOCK_SIGNATURE_HEADER]: signMockWebhook("test-secret", rawBody) },
    rawBody,
  });
}

describe("order transitions", () => {
  it("rejects arbitrary order transitions", () => {
    expect(() => assertOrderTransition("draft", "paid")).toThrow(CommerceError);
    expect(() => assertOrderTransition("paid", "pending_payment")).toThrow(CommerceError);
    expect(() => assertOrderTransition("cancelled", "paid")).toThrow(CommerceError);
    expect(() => assertOrderTransition("refunded", "paid")).toThrow(CommerceError);
    expect(() => assertOrderTransition("voided", "paid")).toThrow(CommerceError);
    expect(canTransitionOrder("pending_payment", "voided")).toBe(true);
    expect(canTransitionOrder("paid", "voided")).toBe(true);
  });
});

describe("commerce checkout and payments", () => {
  it("confirms payment success from a verified webhook and does not invent a provider subscription", async () => {
    const { commerce, store } = createTestCommerce();
    const intent = await startCheckout(commerce);
    const order = await store.getOrderByPublicId(intent.orderPublicId);
    expect(order?.status).toBe("pending_payment");
    expect(intent.checkoutAction.mode).toBe("redirect");

    const result = await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_success_1",
    );

    expect(result.status).toBe("processed");
    const paid = await store.getOrderByPublicId(intent.orderPublicId);
    expect(paid?.status).toBe("paid");
    const payment = store.payments[0];
    expect(payment?.status).toBe("succeeded");
    expect(store.subscriptions).toHaveLength(0);
  });

  it("records payment failure without marking the order paid", async () => {
    const { commerce, store } = createTestCommerce();
    const intent = await startCheckout(commerce);

    const result = await postWebhook(
      commerce,
      "payment.failed",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_fail_1",
    );

    expect(result.status).toBe("processed");
    const order = await store.getOrderByPublicId(intent.orderPublicId);
    expect(order?.status).toBe("pending_payment");
    expect(store.payments[0]?.status).toBe("failed");
    expect(store.subscriptions).toHaveLength(0);
  });

  it("refunds a paid order via the request-refund command", async () => {
    const { commerce, store, provider } = createTestCommerce();
    const refundSpy = { calls: 0 };
    const original = provider.refund.bind(provider);
    provider.refund = async (input) => {
      refundSpy.calls += 1;
      return original(input);
    };
    const intent = await startCheckout(commerce);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_pay_1",
    );

    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");
    await commerce.requestRefund({ paymentId: payment.id, amountMinor: 599000n });

    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("refunded");
    expect(store.payments[0]?.status).toBe("refunded");
    expect(refundSpy.calls).toBe(1);
    expect(store.refunds).toHaveLength(1);
  });

  it("does not call provider.refund when a refund webhook arrives", async () => {
    const { commerce, store, provider } = createTestCommerce();
    const refundSpy = { calls: 0 };
    provider.refund = async () => {
      refundSpy.calls += 1;
      return { providerRefundId: "should-not-run" };
    };
    const intent = await startCheckout(commerce);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_pay_wh",
    );
    await postWebhook(
      commerce,
      "payment.refunded",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_ref_wh",
    );
    expect(refundSpy.calls).toBe(0);
    expect(store.payments[0]?.status).toBe("refunded");
  });

  it("supports partial then full refund", async () => {
    const { commerce, store } = createTestCommerce(oneTimeOffer);
    const intent = await startCheckout(commerce, oneTimeOffer);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      499000n,
      "evt_life_1",
    );
    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");

    await commerce.refundPayment({ paymentId: payment.id, amountMinor: 5000n });
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("partially_refunded");
    expect(store.payments[0]?.status).toBe("succeeded");

    await expect(
      commerce.refundPayment({ paymentId: payment.id, amountMinor: 499000n }),
    ).rejects.toMatchObject({ code: "INVALID_AMOUNT" });

    await commerce.refundPayment({ paymentId: payment.id, amountMinor: 494000n });
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("refunded");
    expect(store.payments[0]?.status).toBe("refunded");
  });

  it("is idempotent for duplicate webhook event ids", async () => {
    const { commerce, store, records } = createTestCommerce();
    const intent = await startCheckout(commerce);
    const bodyType = "payment.succeeded";
    const providerPaymentId = `mockpay_${intent.orderPublicId}`;

    const first = await postWebhook(commerce, bodyType, providerPaymentId, 599000n, "evt_dup");
    const second = await postWebhook(commerce, bodyType, providerPaymentId, 599000n, "evt_dup");

    expect(first.status).toBe("processed");
    expect(second.status).toBe("duplicate");
    expect(store.payments.filter((row) => row.status === "succeeded")).toHaveLength(1);
    expect(store.subscriptions).toHaveLength(0);
    expect(records.filter((row) => row.action === "commerce.webhook.duplicate")).toHaveLength(1);
  });

  it("rejects payment.succeeded when amount does not match the stored payment", async () => {
    const { commerce } = createTestCommerce();
    const intent = await startCheckout(commerce);
    await expect(
      postWebhook(commerce, "payment.succeeded", `mockpay_${intent.orderPublicId}`, 1n, "evt_amt"),
    ).rejects.toMatchObject({ code: "WEBHOOK_INVALID" });
  });

  it("rejects payment.succeeded when currency does not match the stored payment", async () => {
    const { commerce } = createTestCommerce();
    const intent = await startCheckout(commerce);
    await expect(
      postWebhook(
        commerce,
        "payment.succeeded",
        `mockpay_${intent.orderPublicId}`,
        599000n,
        "evt_cur",
        "USD",
      ),
    ).rejects.toMatchObject({ code: "WEBHOOK_INVALID" });
  });

  it("rejects a webhook for an unknown provider payment id", async () => {
    const { commerce } = createTestCommerce();
    await startCheckout(commerce);
    await expect(
      postWebhook(commerce, "payment.succeeded", "mockpay_unknown", 599000n, "evt_unknown"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects unsigned webhooks", async () => {
    const { commerce } = createTestCommerce();
    await expect(
      commerce.processWebhook({
        providerId: "mock",
        headers: {},
        rawBody: JSON.stringify({ id: "evt_x", type: "payment.succeeded" }),
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_INVALID" });
  });

  it("does not treat the success URL as payment confirmation", async () => {
    const { commerce, store } = createTestCommerce();
    const intent = await startCheckout(commerce);
    expect(intent.checkoutAction.mode).toBe("redirect");
    if (intent.checkoutAction.mode === "redirect") {
      expect(intent.checkoutAction.url).not.toContain("confirmPayment");
    }
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("pending_payment");
  });

  it("invokes afterPaid only for newly processed webhooks, not duplicates", async () => {
    const paid: string[] = [];
    const store = new MemoryCommerceRepository(() => NOW);
    const { audit } = recordingAudit();
    const commerce = createCommerceService({
      store,
      provider: new MockDevelopmentPaymentProvider({
        webhookSecret: "test-secret",
        hostedBaseUrl: "http://localhost:3001",
      }),
      catalog: testCatalog(),
      audit,
      now: () => NOW,
      hooks: {
        afterPaid: async (ctx) => {
          paid.push(ctx.order.publicId);
        },
      },
    });
    const intent = await startCheckout(commerce);
    await postWebhook(commerce, "payment.succeeded", `mockpay_${intent.orderPublicId}`, 599000n, "evt_hook");
    await postWebhook(commerce, "payment.succeeded", `mockpay_${intent.orderPublicId}`, 599000n, "evt_hook");
    expect(paid).toEqual([intent.orderPublicId]);
  });
});

const SEPAY_WEBHOOK_SECRET = "test-webhook-secret";

function sepayProvider() {
  return new SePayPaymentProvider({
    bankCode: "MBBank",
    bankAccountNumber: "0123456789",
    bankAccountName: "KHEPREE",
    webhookSecret: SEPAY_WEBHOOK_SECRET,
    webhookAuth: "hmac_sha256",
  });
}

function createSepayCommerce(hooks?: {
  afterRefunded?: (ctx: { payment: { id: string } }) => Promise<void>;
  afterVoided?: (ctx: { payment: { id: string } }) => Promise<void>;
  afterPaid?: (ctx: { order: { publicId: string } }) => Promise<void>;
}) {
  const store = new MemoryCommerceRepository(() => NOW);
  const { audit, records } = recordingAudit();
  const provider = sepayProvider();
  const commerce = createCommerceService({
    store,
    provider,
    catalog: testCatalog(),
    audit,
    now: () => NOW,
    hooks,
  });
  return { commerce, store, records, provider };
}

function sepayTransferBody(orderPublicId: string, amount = 599000) {
  return JSON.stringify({
    id: Date.now(),
    gateway: "MBBank",
    transactionDate: "2026-08-31 12:00:00",
    accountNumber: "0123456789",
    code: `KHP_${orderPublicId}`,
    content: `KHP_${orderPublicId}`,
    transferType: "in",
    transferAmount: amount,
  });
}

async function postSepayTransfer(commerce: CommerceService, orderPublicId: string, amount = 599000) {
  const rawBody = sepayTransferBody(orderPublicId, amount);
  const signature = createHmac("sha256", SEPAY_WEBHOOK_SECRET).update(rawBody, "utf8").digest("hex");
  return commerce.processWebhook({
    providerId: "sepay",
    headers: { "x-sepay-signature": signature },
    rawBody,
  });
}

describe("SePay QR refund and one-time access", () => {
  it("persists manual_required without changing payment, order, or access", async () => {
    const refunded: string[] = [];
    const { commerce, store } = createSepayCommerce({
      afterRefunded: async (ctx) => {
        refunded.push(ctx.payment.id);
      },
    });
    const intent = await startCheckout(commerce);
    await postSepayTransfer(commerce, intent.orderPublicId);
    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");

    const result = await commerce.requestRefund({
      paymentId: payment.id,
      amountMinor: 599000n,
      actorUserId: OWNER.userId,
      reason: "customer_request",
    });

    expect(result.outcome).toBe("manual_required");
    expect(result.refund.status).toBe("manual_required");
    expect(store.payments[0]?.status).toBe("succeeded");
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("paid");
    expect(refunded).toEqual([]);
  });

  it("confirms a manual refund once and is idempotent on duplicate confirmation", async () => {
    const refunded: string[] = [];
    const { commerce, store } = createSepayCommerce({
      afterRefunded: async (ctx) => {
        refunded.push(ctx.payment.id);
      },
    });
    const intent = await startCheckout(commerce);
    await postSepayTransfer(commerce, intent.orderPublicId);
    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");

    const requested = await commerce.requestRefund({
      paymentId: payment.id,
      amountMinor: 599000n,
      actorUserId: OWNER.userId,
    });
    expect(requested.outcome).toBe("manual_required");

    const first = await commerce.confirmManualRefund({
      refundId: requested.refund.id,
      actorUserId: OWNER.userId,
      reason: "finance_confirmed",
    });
    expect(first.outcome).toBe("completed");
    expect(first.refund.status).toBe("succeeded");
    expect(store.payments[0]?.status).toBe("refunded");
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("refunded");
    expect(refunded).toHaveLength(1);

    const second = await commerce.confirmManualRefund({
      refundId: requested.refund.id,
      actorUserId: OWNER.userId,
      reason: "finance_confirmed",
    });
    expect(second.outcome).toBe("completed");
    expect(refunded).toHaveLength(1);
  });


  it("does not create a provider subscription for a one-time annual SePay purchase", async () => {
    const { commerce, store } = createSepayCommerce();
    const intent = await startCheckout(commerce);
    await postSepayTransfer(commerce, intent.orderPublicId);
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("paid");
    expect(store.subscriptions).toHaveLength(0);
  });

  it("does not treat providerPaymentId as a subscription id even if recurring is advertised", async () => {
    const store = new MemoryCommerceRepository(() => NOW);
    const { audit } = recordingAudit();
    const provider = new MockDevelopmentPaymentProvider({
      webhookSecret: "test-secret",
      hostedBaseUrl: "http://localhost:3001",
    });
    provider.capabilities.supportsRecurring = true;
    const commerce = createCommerceService({
      store,
      provider,
      catalog: testCatalog(),
      audit,
      now: () => NOW,
    });
    const intent = await startCheckout(commerce);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_recurring_trap",
    );
    expect(store.subscriptions).toHaveLength(0);
  });

  it("creates a subscription only when checkout returns providerSubscriptionId", async () => {
    const store = new MemoryCommerceRepository(() => NOW);
    const { audit } = recordingAudit();
    const inner = new MockDevelopmentPaymentProvider({
      webhookSecret: "test-secret",
      hostedBaseUrl: "http://localhost:3001",
    });
    const provider: PaymentProvider = {
      ...inner,
      id: inner.id,
      capabilities: { ...inner.capabilities, supportsRecurring: true },
      createCheckout: async (input) => {
        const result = await inner.createCheckout(input);
        return { ...result, providerSubscriptionId: "sub_real_sepay_agreement" };
      },
      verifyWebhook: (request) => inner.verifyWebhook(request),
      normalizeWebhookEvent: (verified) => inner.normalizeWebhookEvent(verified),
      refund: (input) => inner.refund(input),
    };
    const commerce = createCommerceService({
      store,
      provider,
      catalog: testCatalog(),
      audit,
      now: () => NOW,
    });
    const intent = await startCheckout(commerce);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      599000n,
      "evt_real_sub",
    );
    expect(store.subscriptions).toHaveLength(1);
    expect(store.subscriptions[0]?.providerSubscriptionId).toBe("sub_real_sepay_agreement");
    expect(store.payments[0]?.providerSubscriptionId).toBe("sub_real_sepay_agreement");
  });
});
