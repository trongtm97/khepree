import { describe, expect, it } from "vitest";
import type { AuditService } from "@khepree/db";
import { CommerceError } from "./errors";
import { assertOrderTransition } from "./order-state";
import {
  MOCK_SIGNATURE_HEADER,
  MockDevelopmentPaymentProvider,
  signMockWebhook,
} from "./provider";
import { createCommerceService, type CommerceService } from "./service";
import { MemoryCommerceRepository } from "./store";
import type { CatalogReader, PurchasableOffer } from "./types";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const OWNER = { type: "user" as const, userId: "user_1" };

const recurringOffer: PurchasableOffer = {
  product: { id: "prod-1", publicId: "prod_sample", slug: "sample", name: "Sample" },
  plan: {
    id: "plan-1",
    publicId: "plan_pro",
    slug: "sample-pro",
    name: "Pro",
    billingType: "recurring",
  },
  price: {
    id: "price-1",
    publicId: "price_sample_pro_usd",
    currency: "USD",
    amountMinor: 1900n,
    interval: "month",
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
  },
  price: {
    id: "price-2",
    publicId: "price_sample_lifetime_usd",
    currency: "USD",
    amountMinor: 19900n,
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
) {
  const rawBody = JSON.stringify({
    id: eventId,
    type,
    data: {
      providerPaymentId,
      amountMinor: amountMinor.toString(),
      currency: "USD",
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
  });
});

describe("commerce checkout and payments", () => {
  it("confirms payment success from a verified webhook and opens a subscription", async () => {
    const { commerce, store } = createTestCommerce();
    const intent = await startCheckout(commerce);
    const order = await store.getOrderByPublicId(intent.orderPublicId);
    expect(order?.status).toBe("pending_payment");

    const result = await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      1900n,
      "evt_success_1",
    );

    expect(result.status).toBe("processed");
    const paid = await store.getOrderByPublicId(intent.orderPublicId);
    expect(paid?.status).toBe("paid");
    const payment = store.payments[0];
    expect(payment?.status).toBe("succeeded");
    expect(store.subscriptions).toHaveLength(1);
    expect(store.subscriptions[0]?.status).toBe("active");
  });

  it("records payment failure without marking the order paid", async () => {
    const { commerce, store } = createTestCommerce();
    const intent = await startCheckout(commerce);

    const result = await postWebhook(
      commerce,
      "payment.failed",
      `mockpay_${intent.orderPublicId}`,
      1900n,
      "evt_fail_1",
    );

    expect(result.status).toBe("processed");
    const order = await store.getOrderByPublicId(intent.orderPublicId);
    expect(order?.status).toBe("pending_payment");
    expect(store.payments[0]?.status).toBe("failed");
    expect(store.subscriptions).toHaveLength(0);
  });

  it("refunds a paid order and cancels the subscription", async () => {
    const { commerce, store } = createTestCommerce();
    const intent = await startCheckout(commerce);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      1900n,
      "evt_pay_1",
    );

    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");
    await commerce.refundPayment({ paymentId: payment.id, amountMinor: 1900n });

    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("refunded");
    expect(store.payments[0]?.status).toBe("refunded");
    expect(store.subscriptions[0]?.status).toBe("cancelled");
  });

  it("supports partial then full refund", async () => {
    const { commerce, store } = createTestCommerce(oneTimeOffer);
    const intent = await startCheckout(commerce, oneTimeOffer);
    await postWebhook(
      commerce,
      "payment.succeeded",
      `mockpay_${intent.orderPublicId}`,
      19900n,
      "evt_life_1",
    );
    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");

    await commerce.refundPayment({ paymentId: payment.id, amountMinor: 5000n });
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("partially_refunded");
    expect(store.payments[0]?.status).toBe("succeeded");

    await commerce.refundPayment({ paymentId: payment.id, amountMinor: 19900n });
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("refunded");
    expect(store.payments[0]?.status).toBe("refunded");
  });

  it("is idempotent for duplicate webhook event ids", async () => {
    const { commerce, store, records } = createTestCommerce();
    const intent = await startCheckout(commerce);
    const bodyType = "payment.succeeded";
    const providerPaymentId = `mockpay_${intent.orderPublicId}`;

    const first = await postWebhook(commerce, bodyType, providerPaymentId, 1900n, "evt_dup");
    const second = await postWebhook(commerce, bodyType, providerPaymentId, 1900n, "evt_dup");

    expect(first.status).toBe("processed");
    expect(second.status).toBe("duplicate");
    expect(store.payments.filter((row) => row.status === "succeeded")).toHaveLength(1);
    expect(store.subscriptions).toHaveLength(1);
    expect(records.filter((row) => row.action === "commerce.webhook.duplicate")).toHaveLength(1);
  });

  it("rejects payment.succeeded when amount does not match the stored payment", async () => {
    const { commerce } = createTestCommerce();
    const intent = await startCheckout(commerce);
    await expect(
      postWebhook(commerce, "payment.succeeded", `mockpay_${intent.orderPublicId}`, 1n, "evt_amt"),
    ).rejects.toMatchObject({ code: "WEBHOOK_INVALID" });
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
    expect(intent.checkoutUrl).not.toContain("confirmPayment");
    expect((await store.getOrderByPublicId(intent.orderPublicId))?.status).toBe("pending_payment");
  });

  it("invokes afterPaid after the payment transaction commits, including duplicate webhooks", async () => {
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
    await postWebhook(commerce, "payment.succeeded", `mockpay_${intent.orderPublicId}`, 1900n, "evt_hook");
    await postWebhook(commerce, "payment.succeeded", `mockpay_${intent.orderPublicId}`, 1900n, "evt_hook");
    expect(paid).toEqual([intent.orderPublicId, intent.orderPublicId]);
  });
});
