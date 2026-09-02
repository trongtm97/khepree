import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CommerceError } from "./errors";
import {
  SePayPaymentProvider,
  generateSepayQrUrl,
  parseSepayTransferWebhook,
  sanitizeSepayTransferPayload,
  sepayInvoiceNumber,
  sepayTransferCode,
} from "./sepay";

const WEBHOOK_SECRET = "test-webhook-secret";

function provider() {
  return new SePayPaymentProvider({
    bankCode: "MBBank",
    bankAccountNumber: "0123456789",
    bankAccountName: "KHEPREE COMPANY",
    webhookSecret: WEBHOOK_SECRET,
    webhookAuth: "hmac_sha256",
  });
}

function signBody(rawBody: string) {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest("hex");
}

describe("SePay QR checkout", () => {
  it("generates an 11-char numeric transfer code", () => {
    expect(sepayTransferCode()).toMatch(/^KHP\d{8}$/);
  });

  it("still recognizes legacy invoice numbers for webhook matching", () => {
    expect(sepayInvoiceNumber("ord_abcDEF123456")).toBe("KHP_ord_abcDEF123456");
  });

  it("builds a VietQR image URL", () => {
    expect(
      generateSepayQrUrl({
        accountNumber: "0123456789",
        bankCode: "MBBank",
        amountMinor: 599000n,
        transferContent: "KHP12345678",
      }),
    ).toBe("https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=599000&des=KHP12345678");
  });

  it("returns qr_display checkout action with a short transfer code", async () => {
    const result = await provider().createCheckout({
      orderPublicId: "ord_abc",
      amountMinor: 599000n,
      currency: "VND",
      successUrl: "https://account.example/billing",
      cancelUrl: "https://account.example/checkout",
    });
    expect(result.checkoutAction.mode).toBe("qr_display");
    if (result.checkoutAction.mode !== "qr_display") throw new Error("expected qr_display");
    expect(result.providerCheckoutId).toMatch(/^KHP\d{8}$/);
    expect(result.checkoutAction.transferContent).toBe(result.providerCheckoutId);
    expect(result.checkoutAction.qrUrl).toContain("amount=599000");
  });

  it("reuses an existing provider checkout id when rebuilding QR UI", async () => {
    const result = await provider().createCheckout({
      orderPublicId: "ord_abc",
      amountMinor: 599000n,
      currency: "VND",
      successUrl: "https://account.example/billing",
      cancelUrl: "https://account.example/checkout",
      providerCheckoutId: "KHP87654321",
    });
    expect(result.providerCheckoutId).toBe("KHP87654321");
    expect(result.checkoutAction.mode).toBe("qr_display");
    if (result.checkoutAction.mode !== "qr_display") throw new Error("expected qr_display");
    expect(result.checkoutAction.transferContent).toBe("KHP87654321");
  });

  it("rejects non-VND checkout", async () => {
    await expect(
      provider().createCheckout({
        orderPublicId: "ord_abc",
        amountMinor: 100n,
        currency: "USD",
        successUrl: "https://account.example/billing",
        cancelUrl: "https://account.example/checkout",
      }),
    ).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
  });
});

describe("SePay transfer webhook", () => {
  const transferIn = {
    id: 123456,
    gateway: "MBBank",
    transactionDate: "2026-08-31 12:00:00",
    accountNumber: "0123456789",
    code: "KHP12345678",
    content: "KHP12345678 thanh toan",
    transferType: "in",
    transferAmount: 599000,
  };

  it("parses incoming transfer payload with short code", () => {
    const parsed = parseSepayTransferWebhook(transferIn);
    expect(parsed?.invoiceNumber).toBe("KHP12345678");
    expect(parsed?.amountMinor).toBe(599000n);
    expect(parsed?.eventId).toBe("transfer:123456");
  });

  it("parses legacy KHP_ord_* transfer content", () => {
    const parsed = parseSepayTransferWebhook({
      ...transferIn,
      code: "KHP_ord_abc",
      content: "KHP_ord_abc thanh toan",
    });
    expect(parsed?.invoiceNumber).toBe("KHP_ord_abc");
  });

  it("accepts a valid HMAC signature and normalizes payment_succeeded", async () => {
    const rawBody = JSON.stringify(transferIn);
    const verified = await provider().verifyWebhook({
      headers: { "x-sepay-signature": signBody(rawBody) },
      rawBody,
    });
    const event = provider().normalizeWebhookEvent(verified);
    expect(event?.type).toBe("payment_succeeded");
    expect(event?.providerPaymentId).toBe("KHP12345678");
    expect(event?.amountMinor).toBe(599000n);
    expect(event?.paymentMethod).toBe("BANK_TRANSFER");
  });

  it("rejects an invalid signature", async () => {
    await expect(
      provider().verifyWebhook({
        headers: { "x-sepay-signature": "bad" },
        rawBody: JSON.stringify(transferIn),
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_INVALID" });
  });

  it("ignores outgoing transfers", () => {
    const verified = {
      provider: "sepay",
      eventId: "transfer:999",
      eventType: "out",
      payload: sanitizeSepayTransferPayload({ ...transferIn, transferType: "out" }),
    };
    expect(provider().normalizeWebhookEvent(verified)).toBeNull();
  });

  it("sanitizes persisted webhook payload", () => {
    const sanitized = sanitizeSepayTransferPayload({
      ...transferIn,
      description: "secret bank memo",
      accumulated: 9999999,
    });
    expect(sanitized.code).toBe("KHP12345678");
    expect(sanitized).not.toHaveProperty("description");
    expect(sanitized).not.toHaveProperty("accumulated");
  });

  it("requires bank credentials at construction", () => {
    expect(
      () =>
        new SePayPaymentProvider({
          bankCode: "",
          bankAccountNumber: "0123456789",
          bankAccountName: "KHEPREE",
          webhookSecret: WEBHOOK_SECRET,
        }),
    ).toThrow(CommerceError);
  });
});
