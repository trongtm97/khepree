import { describe, expect, it } from "vitest";
import {
  MOCK_SIGNATURE_HEADER,
  MockDevelopmentPaymentProvider,
  signMockWebhook,
} from "./provider";

const provider = new MockDevelopmentPaymentProvider({
  webhookSecret: "secret",
  hostedBaseUrl: "http://localhost:3001",
});

describe("MockDevelopmentPaymentProvider", () => {
  it("returns a hosted checkout URL, not a card form", async () => {
    const result = await provider.createCheckout({
      orderPublicId: "ord_abc",
      amountMinor: 1900n,
      currency: "USD",
      successUrl: "http://localhost:3001/billing?checkout=processing",
      cancelUrl: "http://localhost:3001/checkout",
    });
    expect(result.providerCheckoutId).toBe("mockpay_ord_abc");
    expect(result.checkoutUrl).toContain("/checkout/mock/ord_abc");
  });

  it("normalizes a verified payment.succeeded payload", async () => {
    const rawBody = JSON.stringify({
      id: "evt_1",
      type: "payment.succeeded",
      data: { providerPaymentId: "mockpay_ord_abc", amountMinor: "1900", currency: "USD" },
    });
    const verified = await provider.verifyWebhook({
      headers: { [MOCK_SIGNATURE_HEADER]: signMockWebhook("secret", rawBody) },
      rawBody,
    });
    const event = provider.normalizeWebhookEvent(verified);
    expect(event?.type).toBe("payment_succeeded");
    expect(event?.amountMinor).toBe(1900n);
  });
});
