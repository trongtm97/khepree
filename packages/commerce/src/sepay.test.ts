import { describe, expect, it } from "vitest";
import { CommerceError } from "./errors";
import {
  SePayPaymentProvider,
  SEPAY_FORM_FIELD_ORDER,
  buildSepayCheckoutFields,
  sepayCheckoutInitUrl,
  sepayFormFieldNames,
  sepayInvoiceNumber,
  sepaySigningString,
  signSepayFields,
  sanitizeSepayIpnPayload,
  parseSepayIpn,
} from "./sepay";
import type { CheckoutFormField } from "./types";

const SECRET = "test-sepay-secret";
const IPN_SECRET = "test-ipn-secret";

function provider() {
  return new SePayPaymentProvider({
    env: "sandbox",
    merchantId: "MERCHANT_123",
    secretKey: SECRET,
    ipnSecret: IPN_SECRET,
  });
}

const officialFields = {
  order_amount: "100000",
  merchant: "MERCHANT_123",
  currency: "VND",
  operation: "PURCHASE",
  order_description: "Payment for order #12345",
  order_invoice_number: "INV_20231201_001",
  success_url: "https://yoursite.com/payment/success",
  error_url: "https://yoursite.com/payment/error",
  cancel_url: "https://yoursite.com/payment/cancel",
};

function fieldValue(fields: CheckoutFormField[], name: string): string | undefined {
  return fields.find((field) => field.name === name)?.value;
}

function assertSignatureMatchesOrder(fields: CheckoutFormField[]) {
  expect(fields.at(-1)?.name).toBe("signature");
  const withoutSignature = fields.filter((field) => field.name !== "signature");
  const record = Object.fromEntries(withoutSignature.map((field) => [field.name, field.value]));
  expect(signSepayFields(record, SECRET)).toBe(fieldValue(fields, "signature"));
  expect(sepaySigningString(record)).toBe(
    withoutSignature.map((field) => `${field.name}=${field.value}`).join(","),
  );
}

describe("SePay signing and checkout", () => {
  it("builds the official HMAC signing string in field order", () => {
    expect(sepaySigningString(officialFields)).toBe(
      "order_amount=100000,merchant=MERCHANT_123,currency=VND,operation=PURCHASE,order_description=Payment for order #12345,order_invoice_number=INV_20231201_001,success_url=https://yoursite.com/payment/success,error_url=https://yoursite.com/payment/error,cancel_url=https://yoursite.com/payment/cancel",
    );
  });

  it("produces a stable Base64 HMAC-SHA256 signature", () => {
    const first = signSepayFields(officialFields, SECRET);
    const second = signSepayFields(officialFields, SECRET);
    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("uses unique invoice numbers that round-trip to the order public id", () => {
    expect(sepayInvoiceNumber("ord_abcDEF123456")).toBe("KHP_ord_abcDEF123456");
  });

  it("uses sandbox vs production checkout hosts", () => {
    expect(sepayCheckoutInitUrl("sandbox")).toBe("https://pay-sandbox.sepay.vn/v1/checkout/init");
    expect(sepayCheckoutInitUrl("production")).toBe("https://pay.sepay.vn/v1/checkout/init");
  });

  it("serializes canonical field order when optional fields are absent", async () => {
    const result = await provider().createCheckout({
      orderPublicId: "ord_abc",
      amountMinor: 599000n,
      currency: "VND",
      successUrl: "https://account.khepree.com/billing?checkout=processing",
      cancelUrl: "https://account.khepree.com/checkout?cancelled=1",
      errorUrl: "https://account.khepree.com/checkout?error=payment",
    });
    expect(result.checkoutAction.mode).toBe("form_post");
    if (result.checkoutAction.mode !== "form_post") throw new Error("expected form_post");
    expect(result.checkoutAction.action).toContain("pay-sandbox.sepay.vn");
    expect(sepayFormFieldNames(result.checkoutAction.fields)).toEqual([
      "order_amount",
      "merchant",
      "currency",
      "operation",
      "order_description",
      "order_invoice_number",
      "success_url",
      "error_url",
      "cancel_url",
      "signature",
    ]);
    expect(fieldValue(result.checkoutAction.fields, "currency")).toBe("VND");
    expect(fieldValue(result.checkoutAction.fields, "order_amount")).toBe("599000");
    expect(fieldValue(result.checkoutAction.fields, "order_invoice_number")).toBe("KHP_ord_abc");
    expect(JSON.stringify(result.checkoutAction.fields)).not.toContain(SECRET);
    assertSignatureMatchesOrder(result.checkoutAction.fields);

    await expect(
      provider().createCheckout({
        orderPublicId: "ord_abc",
        amountMinor: 1999n,
        currency: "USD",
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
      }),
    ).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
  });

  it("places customer_id before callback URLs", () => {
    const fields = buildSepayCheckoutFields(
      { ...officialFields, customer_id: "user_1" },
      SECRET,
    );
    expect(sepayFormFieldNames(fields)).toEqual([
      "order_amount",
      "merchant",
      "currency",
      "operation",
      "order_description",
      "order_invoice_number",
      "customer_id",
      "success_url",
      "error_url",
      "cancel_url",
      "signature",
    ]);
    assertSignatureMatchesOrder(fields);
  });

  it("places payment_method before callback URLs when customer_id is absent", () => {
    const fields = buildSepayCheckoutFields(
      { ...officialFields, payment_method: "BANK_TRANSFER" },
      SECRET,
    );
    expect(sepayFormFieldNames(fields)).toEqual([
      "order_amount",
      "merchant",
      "currency",
      "operation",
      "order_description",
      "order_invoice_number",
      "payment_method",
      "success_url",
      "error_url",
      "cancel_url",
      "signature",
    ]);
    assertSignatureMatchesOrder(fields);
  });

  it("keeps official order when both optional fields are present", async () => {
    const result = await provider().createCheckout({
      orderPublicId: "ord_abc",
      amountMinor: 599000n,
      currency: "VND",
      successUrl: "https://account.khepree.com/ok",
      cancelUrl: "https://account.khepree.com/cancel",
      errorUrl: "https://account.khepree.com/error",
      customerId: "user_1",
      paymentMethod: "BANK_TRANSFER",
    });
    if (result.checkoutAction.mode !== "form_post") throw new Error("expected form_post");
    expect(sepayFormFieldNames(result.checkoutAction.fields)).toEqual([...SEPAY_FORM_FIELD_ORDER]);
    expect(fieldValue(result.checkoutAction.fields, "customer_id")).toBe("user_1");
    expect(fieldValue(result.checkoutAction.fields, "payment_method")).toBe("BANK_TRANSFER");
    assertSignatureMatchesOrder(result.checkoutAction.fields);
  });

  it("does not use object insertion order for optional fields", () => {
    const insertionTrap = {
      order_amount: "100000",
      merchant: "MERCHANT_123",
      currency: "VND",
      operation: "PURCHASE",
      order_description: "x",
      order_invoice_number: "INV",
      success_url: "https://ok",
      error_url: "https://err",
      cancel_url: "https://cancel",
      customer_id: "late",
    };
    expect(Object.keys(insertionTrap).indexOf("customer_id")).toBeGreaterThan(
      Object.keys(insertionTrap).indexOf("success_url"),
    );
    const fields = buildSepayCheckoutFields(insertionTrap, SECRET);
    expect(sepayFormFieldNames(fields).indexOf("customer_id")).toBeLessThan(
      sepayFormFieldNames(fields).indexOf("success_url"),
    );
  });

  it("fails fast without credentials", () => {
    expect(
      () =>
        new SePayPaymentProvider({
          env: "sandbox",
          merchantId: "CHANGE_ME",
          secretKey: SECRET,
          ipnSecret: IPN_SECRET,
        }),
    ).toThrow(CommerceError);
  });

  it("does not fake recurring or automated refunds", async () => {
    const sepay = provider();
    expect(sepay.capabilities.supportsRecurring).toBe(false);
    expect(sepay.capabilities.supportsRefund).toBe(false);
    expect(sepay.capabilities.supportsPartialRefund).toBe(false);
    await expect(
      sepay.refund({
        providerPaymentId: "KHP_ord_abc",
        amountMinor: 599000n,
        currency: "VND",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED" });
  });
});

describe("SePay IPN", () => {
  const rawOrderPaid = {
    timestamp: 1757058220,
    notification_type: "ORDER_PAID",
    order: {
      id: "e2c195be-c721-47eb-b323-99ab24e52d85",
      order_id: "NPSETVI00101000042R",
      order_status: "CAPTURED",
      order_currency: "VND",
      order_amount: "599000.00",
      order_invoice_number: "KHP_ord_abc",
      user_agent: "Mozilla/5.0",
      ip_address: "14.1.2.3",
      order_description: "Pro",
    },
    transaction: {
      id: "384c66dd-41e6-4316-a544-b4141682595c",
      payment_method: "BANK_TRANSFER",
      transaction_id: "68ba94ac80123",
      transaction_type: "PAYMENT",
      transaction_status: "APPROVED",
      transaction_amount: "599000",
      transaction_currency: "VND",
      card_number: "4111XXXXXXXX1111",
      card_holder_name: "NGUYEN VAN A",
      card_expiry: "12/26",
    },
    customer: { id: "cust", customer_id: "user_1" },
  };

  it("accepts a valid IPN secret and normalizes ORDER_PAID", async () => {
    const rawBody = JSON.stringify(rawOrderPaid);
    const verified = await provider().verifyWebhook({
      headers: { "X-Secret-Key": IPN_SECRET },
      rawBody,
    });
    const event = provider().normalizeWebhookEvent(verified);
    expect(event?.type).toBe("payment_succeeded");
    expect(event?.amountMinor).toBe(599000n);
    expect(event?.currency).toBe("VND");
    expect(event?.providerPaymentId).toBe("KHP_ord_abc");
  });

  it("rejects an invalid IPN secret", async () => {
    await expect(
      provider().verifyWebhook({
        headers: { "X-Secret-Key": "wrong" },
        rawBody: JSON.stringify(rawOrderPaid),
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_INVALID" });
  });

  it("redacts card holder, PAN, expiry, UA, and IP from persisted payload", async () => {
    const verified = await provider().verifyWebhook({
      headers: { "X-Secret-Key": IPN_SECRET },
      rawBody: JSON.stringify(rawOrderPaid),
    });
    const serialized = JSON.stringify(verified.payload);
    expect(serialized).not.toContain("NGUYEN VAN A");
    expect(serialized).not.toContain("4111");
    expect(serialized).not.toContain("12/26");
    expect(serialized).not.toContain("Mozilla");
    expect(serialized).not.toContain("14.1.2.3");
    expect(verified.payload.invoiceNumber).toBe("KHP_ord_abc");
    expect(sanitizeSepayIpnPayload(rawOrderPaid as unknown as Record<string, unknown>).notificationType).toBe(
      "ORDER_PAID",
    );
  });

  it("normalizes TRANSACTION_VOID as payment_voided, not a refund", () => {
    const parsed = parseSepayIpn({
      ...rawOrderPaid,
      notification_type: "TRANSACTION_VOID",
    } as unknown as Record<string, unknown>);
    expect(parsed?.notificationType).toBe("TRANSACTION_VOID");
    const verified = {
      provider: "sepay",
      eventId: parsed!.eventId,
      eventType: "TRANSACTION_VOID",
      payload: {
        notificationType: "TRANSACTION_VOID",
        invoiceNumber: "KHP_ord_abc",
        amount: "599000",
        currency: "VND",
      },
    };
    expect(provider().normalizeWebhookEvent(verified)?.type).toBe("payment_voided");
  });

  it("ignores unknown notification types", () => {
    const event = provider().normalizeWebhookEvent({
      provider: "sepay",
      eventId: "x",
      eventType: "SOMETHING_ELSE",
      payload: {
        notificationType: "SOMETHING_ELSE",
        invoiceNumber: "KHP_ord_abc",
        amount: "599000",
        currency: "VND",
      },
    });
    expect(event).toBeNull();
  });
});
