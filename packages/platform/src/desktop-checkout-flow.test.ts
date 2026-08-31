import { describe, expect, it } from "vitest";
import type { AuditService } from "@khepree/db";
import {
  MemoryCatalogReader,
  MemoryEntitlementRepository,
  createEntitlementOrderHandlers,
  createEntitlementService,
} from "@khepree/entitlement";
import {
  MOCK_SIGNATURE_HEADER,
  MockDevelopmentPaymentProvider,
  MemoryCommerceRepository,
  resolveDesktopCheckoutStatus,
  signMockWebhook,
  createCommerceService,
  type PurchasableOffer,
} from "@khepree/commerce";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const OWNER = { type: "user" as const, userId: "user_1" };
const PRODUCT_ID = "prod-noveltrans";

const offer: PurchasableOffer = {
  product: {
    id: PRODUCT_ID,
    publicId: "prod_nt",
    slug: "noveltrans",
    name: "NovelTrans",
    licensingMode: "ACCOUNT",
  },
  plan: {
    id: "plan-pro",
    publicId: "plan_pro",
    slug: "pro",
    name: "Pro",
    billingType: "one_time",
    accessTermDays: 365,
  },
  price: {
    id: "price-pro",
    publicId: "price_pro_vnd",
    currency: "VND",
    amountMinor: 599000n,
    interval: null,
  },
};

function recordingAudit(): AuditService {
  return { record: async () => undefined };
}

async function setupCommerce() {
  const entitlementStore = new MemoryEntitlementRepository(() => NOW);
  const entitlement = createEntitlementService({
    store: entitlementStore,
    catalog: new MemoryCatalogReader(
      new Map([
        [
          "plan-pro",
          {
            productId: PRODUCT_ID,
            productSlug: "noveltrans",
            planId: "plan-pro",
            planSlug: "pro",
            licensingMode: "ACCOUNT",
            accessTermDays: 365,
            features: [{ key: "devices.max", value: { valueType: "integer", integerValue: 2 } }],
          },
        ],
      ]),
    ),
    audit: recordingAudit(),
    now: () => NOW,
  });
  const store = new MemoryCommerceRepository(() => NOW);
  const provider = new MockDevelopmentPaymentProvider({
    webhookSecret: "test-secret",
    hostedBaseUrl: "http://localhost:3001",
  });
  const commerce = createCommerceService({
    store,
    provider,
    catalog: {
      getPurchasableOffer: async (planPublicId, pricePublicId) =>
        planPublicId === offer.plan.publicId && pricePublicId === offer.price.publicId
          ? offer
          : null,
    },
    audit: recordingAudit(),
    handlers: createEntitlementOrderHandlers(entitlement),
    now: () => NOW,
  });
  return { commerce, store, entitlement };
}

async function postWebhook(
  commerce: ReturnType<typeof createCommerceService>,
  orderPublicId: string,
  eventId: string,
) {
  const rawBody = JSON.stringify({
    id: eventId,
    type: "payment.succeeded",
    data: {
      providerPaymentId: `mockpay_${orderPublicId}`,
      amountMinor: offer.price.amountMinor.toString(),
      currency: "VND",
    },
  });
  return commerce.processWebhook({
    providerId: "mock",
    headers: { [MOCK_SIGNATURE_HEADER]: signMockWebhook("test-secret", rawBody) },
    rawBody,
  });
}

describe("desktop checkout flow", () => {
  it("creates checkout without exposing provider secrets in the handoff contract", async () => {
    const { commerce } = await setupCommerce();
    const intent = await commerce.createCheckoutIntent({
      owner: OWNER,
      planPublicId: offer.plan.publicId,
      pricePublicId: offer.price.publicId,
      locale: "vi",
      successUrl: "http://localhost:3001/billing?checkout=processing",
      cancelUrl: "http://localhost:3001/billing?checkout=cancelled",
      actorUserId: OWNER.userId,
    });
    expect(intent.orderPublicId).toMatch(/^ord_/);
    expect(intent.checkoutAction.mode).toBe("redirect");
    expect(JSON.stringify(intent)).not.toContain("secret");
  });

  it("does not grant entitlement from success redirect alone", async () => {
    const { commerce, entitlement } = await setupCommerce();
    const intent = await commerce.createCheckoutIntent({
      owner: OWNER,
      planPublicId: offer.plan.publicId,
      pricePublicId: offer.price.publicId,
      locale: "vi",
      successUrl: "http://localhost:3001/billing?checkout=processing",
      cancelUrl: "http://localhost:3001/billing?checkout=cancelled",
      actorUserId: OWNER.userId,
    });
    const rows = await entitlement.resolveEntitlementsForPrincipal({
      type: "USER",
      id: OWNER.userId,
    });
    expect(rows).toHaveLength(0);
    expect(intent.checkoutAction.mode).toBe("redirect");
    if (intent.checkoutAction.mode === "redirect") {
      expect(intent.checkoutAction.url).toContain("checkout/mock");
    }
  });

  it("grants entitlement after verified webhook and reports ACCESS_ACTIVE", async () => {
    const { commerce, store, entitlement } = await setupCommerce();
    const intent = await commerce.createCheckoutIntent({
      owner: OWNER,
      planPublicId: offer.plan.publicId,
      pricePublicId: offer.price.publicId,
      locale: "vi",
      successUrl: "http://localhost:3001/billing?checkout=processing",
      cancelUrl: "http://localhost:3001/billing?checkout=cancelled",
      actorUserId: OWNER.userId,
    });

    await postWebhook(commerce, intent.orderPublicId, "evt_1");
    await postWebhook(commerce, intent.orderPublicId, "evt_1_dup");

    const order = await store.getOrderByPublicId(intent.orderPublicId);
    expect(order?.status).toBe("paid");

    const rows = await entitlement.resolveEntitlementsForPrincipal({
      type: "USER",
      id: OWNER.userId,
    });
    expect(rows.some((row) => row.entitlement.productId === PRODUCT_ID)).toBe(true);

    const status = resolveDesktopCheckoutStatus({
      orderStatus: "paid",
      productId: PRODUCT_ID,
      entitlement: rows[0]
        ? {
            productId: rows[0].entitlement.productId,
            status: rows[0].entitlement.status,
            planId: rows[0].entitlement.planId,
          }
        : null,
    });
    expect(status).toBe("ACCESS_ACTIVE");
  });

  it("rejects checkout for invalid plan", async () => {
    const { commerce } = await setupCommerce();
    await expect(
      commerce.createCheckoutIntent({
        owner: OWNER,
        planPublicId: "missing",
        pricePublicId: offer.price.publicId,
        locale: "vi",
        successUrl: "http://localhost:3001/billing",
        cancelUrl: "http://localhost:3001/billing",
      }),
    ).rejects.toMatchObject({ code: "NOT_PURCHASABLE" });
  });

  it("suspends access after refund webhook", async () => {
    const { commerce, store, entitlement } = await setupCommerce();
    const intent = await commerce.createCheckoutIntent({
      owner: OWNER,
      planPublicId: offer.plan.publicId,
      pricePublicId: offer.price.publicId,
      locale: "vi",
      successUrl: "http://localhost:3001/billing",
      cancelUrl: "http://localhost:3001/billing",
      actorUserId: OWNER.userId,
    });
    await postWebhook(commerce, intent.orderPublicId, "evt_pay");

    const payment = store.payments[0];
    if (!payment) throw new Error("missing payment");
    await commerce.requestRefund({ paymentId: payment.id, amountMinor: offer.price.amountMinor });

    const rows = await entitlement.resolveEntitlementsForPrincipal({
      type: "USER",
      id: OWNER.userId,
    });
    expect(rows[0]?.entitlement.status).toBe("suspended");
  });
});
