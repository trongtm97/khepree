import { createHmac, timingSafeEqual } from "node:crypto";
import { parseDecimalToMinor, parseMoneyMinor } from "@khepree/types";
import { CommerceError } from "./errors";
import type { PaymentProvider, PaymentProviderCapabilities } from "./provider";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedCommerceEvent,
  RefundProviderInput,
  RefundProviderResult,
  VerifiedWebhook,
  WebhookRequest,
} from "./types";

export const SEPAY_PROVIDER_ID = "sepay";

const SIGN_FIELD_ORDER = [
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "customer_id",
  "payment_method",
  "success_url",
  "error_url",
  "cancel_url",
] as const;

const CHECKOUT_HOSTS = {
  sandbox: "https://pay-sandbox.sepay.vn/v1/checkout/init",
  production: "https://pay.sepay.vn/v1/checkout/init",
} as const;

export const SEPAY_CHECKOUT_HOSTS = new Set([
  "pay-sandbox.sepay.vn",
  "pay.sepay.vn",
]);

/** Official IPN may include card/PII. Persist only reconciliation fields. */
const SANITIZED_KEYS = [
  "notificationType",
  "providerOrderId",
  "invoiceNumber",
  "transactionId",
  "paymentMethod",
  "status",
  "amount",
  "currency",
  "receivedAt",
] as const;

export interface SePayProviderOptions {
  env: "sandbox" | "production";
  merchantId: string;
  secretKey: string;
  ipnSecret: string;
}

export const SEPAY_CAPABILITIES: PaymentProviderCapabilities = {
  supportsOneTimePayment: true,
  supportsRecurring: false,
  supportsRefund: false,
  supportsPartialRefund: false,
  supportsVoid: true,
};

export function sepayInvoiceNumber(orderPublicId: string): string {
  if (!orderPublicId || orderPublicId.includes("/")) {
    throw new CommerceError("INVALID_AMOUNT", "Order public id is required for SePay invoice");
  }
  return `KHP_${orderPublicId}`;
}

export function sepayCheckoutInitUrl(env: "sandbox" | "production"): string {
  return CHECKOUT_HOSTS[env];
}

/**
 * HMAC-SHA256 over `field=value,field=value` in official field order, then Base64.
 * Source: https://developer.sepay.vn/en/cong-thanh-toan/API/don-hang/form-thanh-toan
 */
export function signSepayFields(fields: Record<string, string>, secretKey: string): string {
  const signed: string[] = [];
  for (const field of SIGN_FIELD_ORDER) {
    const value = fields[field];
    if (value === undefined) continue;
    signed.push(`${field}=${value}`);
  }
  return createHmac("sha256", secretKey).update(signed.join(",")).digest("base64");
}

export function sepaySigningString(fields: Record<string, string>): string {
  const signed: string[] = [];
  for (const field of SIGN_FIELD_ORDER) {
    const value = fields[field];
    if (value === undefined) continue;
    signed.push(`${field}=${value}`);
  }
  return signed.join(",");
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function safeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function sanitizeSepayIpnPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const order = asRecord(payload.order);
  const transaction = asRecord(payload.transaction);
  const sanitized: Record<string, unknown> = {
    notificationType: payload.notification_type,
    providerOrderId: order?.order_id ?? order?.id,
    invoiceNumber: order?.order_invoice_number,
    transactionId: transaction?.transaction_id ?? transaction?.id,
    paymentMethod: transaction?.payment_method,
    status: transaction?.transaction_status ?? order?.order_status,
    amount: transaction?.transaction_amount ?? order?.order_amount,
    currency: transaction?.transaction_currency ?? order?.order_currency,
    receivedAt: payload.timestamp,
  };
  for (const key of Object.keys(sanitized)) {
    if (!SANITIZED_KEYS.includes(key as (typeof SANITIZED_KEYS)[number])) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function parseSepayIpn(payload: Record<string, unknown>): {
  notificationType: string;
  invoiceNumber: string;
  transactionId: string;
  eventId: string;
  amountMinor: bigint;
  currency: string;
  paymentMethod: string | undefined;
} | null {
  const notificationType = asString(payload.notification_type);
  const order = asRecord(payload.order);
  const transaction = asRecord(payload.transaction);
  if (!notificationType || !order) return null;

  const invoiceNumber = asString(order.order_invoice_number);
  const transactionId =
    asString(transaction?.transaction_id) ?? asString(transaction?.id) ?? asString(order.id);
  if (!invoiceNumber || !transactionId) return null;

  const currency = (
    asString(transaction?.transaction_currency) ??
    asString(order.order_currency) ??
    ""
  ).toUpperCase();
  const amountRaw = asString(transaction?.transaction_amount) ?? asString(order.order_amount);
  if (!currency || !amountRaw) return null;

  let amountMinor: bigint;
  try {
    amountMinor = amountRaw.includes(".")
      ? parseDecimalToMinor(amountRaw, currency)
      : parseMoneyMinor(amountRaw);
  } catch {
    return null;
  }

  return {
    notificationType,
    invoiceNumber,
    transactionId,
    eventId: `${notificationType}:${transactionId}`,
    amountMinor,
    currency,
    paymentMethod: asString(transaction?.payment_method),
  };
}

export class SePayPaymentProvider implements PaymentProvider {
  readonly id = SEPAY_PROVIDER_ID;
  readonly capabilities = SEPAY_CAPABILITIES;

  constructor(private readonly options: SePayProviderOptions) {
    if (!options.merchantId || options.merchantId.includes("CHANGE_ME")) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_MERCHANT_ID is required");
    }
    if (!options.secretKey || options.secretKey.includes("CHANGE_ME")) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_SECRET_KEY is required");
    }
    if (!options.ipnSecret || options.ipnSecret.includes("CHANGE_ME")) {
      throw new CommerceError("NOT_CONFIGURED", "SePay IPN secret is required");
    }
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (input.currency.toUpperCase() !== "VND") {
      throw new CommerceError("INVALID_AMOUNT", "SePay checkout only accepts VND");
    }
    if (input.amountMinor <= 0n) {
      throw new CommerceError("INVALID_AMOUNT", "SePay order amount must be greater than 0");
    }

    const invoice = sepayInvoiceNumber(input.orderPublicId);
    const fields: Record<string, string> = {
      order_amount: input.amountMinor.toString(),
      merchant: this.options.merchantId,
      currency: "VND",
      operation: "PURCHASE",
      order_description: input.description ?? `Khepree ${input.orderPublicId}`,
      order_invoice_number: invoice,
      success_url: input.successUrl,
      error_url: input.errorUrl ?? input.cancelUrl,
      cancel_url: input.cancelUrl,
    };
    if (input.customerId) fields.customer_id = input.customerId;
    fields.signature = signSepayFields(fields, this.options.secretKey);

    return {
      providerCheckoutId: invoice,
      checkoutAction: {
        mode: "form_post",
        action: sepayCheckoutInitUrl(this.options.env),
        fields,
      },
    };
  }

  async verifyWebhook(request: WebhookRequest): Promise<VerifiedWebhook> {
    const secret = headerValue(request.headers, "x-secret-key");
    if (!secret || !safeEqualString(secret, this.options.ipnSecret)) {
      throw new CommerceError("WEBHOOK_INVALID", "SePay IPN secret is invalid");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(request.rawBody) as unknown;
    } catch {
      throw new CommerceError("WEBHOOK_INVALID", "SePay IPN body is not JSON");
    }

    const payload = asRecord(parsed);
    if (!payload) {
      throw new CommerceError("WEBHOOK_INVALID", "SePay IPN payload is invalid");
    }

    const parsedIpn = parseSepayIpn(payload);
    if (!parsedIpn) {
      throw new CommerceError("WEBHOOK_INVALID", "SePay IPN payload is missing required fields");
    }

    return {
      provider: SEPAY_PROVIDER_ID,
      eventId: parsedIpn.eventId,
      eventType: parsedIpn.notificationType,
      payload: sanitizeSepayIpnPayload(payload),
    };
  }

  normalizeWebhookEvent(verified: VerifiedWebhook): NormalizedCommerceEvent | null {
    const notificationType = asString(verified.payload.notificationType) ?? verified.eventType;
    const invoiceNumber = asString(verified.payload.invoiceNumber);
    const currency = asString(verified.payload.currency);
    const amountRaw = verified.payload.amount;
    if (!invoiceNumber || !currency || amountRaw === undefined || amountRaw === null) return null;

    let amountMinor: bigint;
    try {
      amountMinor =
        typeof amountRaw === "string" && amountRaw.includes(".")
          ? parseDecimalToMinor(amountRaw, currency)
          : parseMoneyMinor(String(amountRaw));
    } catch {
      return null;
    }

    const type =
      notificationType === "ORDER_PAID"
        ? "payment_succeeded"
        : notificationType === "TRANSACTION_VOID"
          ? "payment_refunded"
          : null;
    if (!type) return null;

    return {
      type,
      provider: SEPAY_PROVIDER_ID,
      providerEventId: verified.eventId,
      providerPaymentId: invoiceNumber,
      amountMinor,
      currency,
      occurredAt: new Date(),
      rawType: notificationType,
      paymentMethod: asString(verified.payload.paymentMethod),
    };
  }

  async refund(_input: RefundProviderInput): Promise<RefundProviderResult> {
    throw new CommerceError(
      "UNSUPPORTED",
      "SePay does not support automated refunds in this integration; use the manual finance workflow",
    );
  }
}
