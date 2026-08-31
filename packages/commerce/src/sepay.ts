import { createHmac, timingSafeEqual } from "node:crypto";
import { parseMoneyMinor } from "@khepree/types";
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

const DEFAULT_QR_BASE_URL = "https://qr.sepay.vn/img";
const INVOICE_PREFIX = "KHP_";

/** Official bank-transfer webhook fields we persist. */
const SANITIZED_TRANSFER_KEYS = [
  "sepayTransactionId",
  "gateway",
  "transferType",
  "transferAmount",
  "code",
  "content",
  "accountNumber",
  "transactionDate",
] as const;

export interface SePayProviderOptions {
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  webhookSecret: string;
  apiKey?: string;
  webhookAuth?: "hmac_sha256" | "api_key";
  qrBaseUrl?: string;
  allowedAccountNumbers?: string[];
}

export const SEPAY_CAPABILITIES: PaymentProviderCapabilities = {
  supportsOneTimePayment: true,
  supportsRecurring: false,
  supportsRefund: false,
  supportsPartialRefund: false,
  supportsVoid: false,
};

export function sepayInvoiceNumber(orderPublicId: string): string {
  if (!orderPublicId || orderPublicId.includes("/")) {
    throw new CommerceError("INVALID_AMOUNT", "Order public id is required for SePay invoice");
  }
  return `${INVOICE_PREFIX}${orderPublicId}`;
}

export function generateSepayQrUrl(input: {
  accountNumber: string;
  bankCode: string;
  amountMinor: bigint;
  transferContent: string;
  qrBaseUrl?: string;
}): string {
  const url = new URL(input.qrBaseUrl?.trim() || DEFAULT_QR_BASE_URL);
  url.searchParams.set("acc", input.accountNumber);
  url.searchParams.set("bank", input.bankCode);
  url.searchParams.set("amount", input.amountMinor.toString());
  url.searchParams.set("des", input.transferContent);
  return url.toString();
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
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseTransferAmount(payload: Record<string, unknown>): bigint | null {
  const raw = payload.transferAmount ?? payload.transfer_amount ?? payload.amount;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return BigInt(Math.round(raw));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseMoneyMinor(raw.trim());
    } catch {
      return null;
    }
  }
  return null;
}

function resolveInvoiceNumber(payload: Record<string, unknown>): string | null {
  const code = asString(payload.code);
  if (code?.startsWith(INVOICE_PREFIX)) return code;

  const content = asString(payload.content) ?? asString(payload.transfer_content);
  if (content) {
    const match = content.match(new RegExp(`${INVOICE_PREFIX}[A-Za-z0-9_]+`));
    if (match) return match[0];
  }

  return code?.startsWith(INVOICE_PREFIX) ? code : null;
}

export function sanitizeSepayTransferPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    sepayTransactionId: payload.id,
    gateway: payload.gateway,
    transferType: payload.transferType ?? payload.transfer_type,
    transferAmount: payload.transferAmount ?? payload.transfer_amount,
    code: payload.code,
    content: payload.content ?? payload.transfer_content,
    accountNumber: payload.accountNumber ?? payload.account_number,
    transactionDate: payload.transactionDate ?? payload.transaction_date,
  };
  for (const key of Object.keys(sanitized)) {
    if (!SANITIZED_TRANSFER_KEYS.includes(key as (typeof SANITIZED_TRANSFER_KEYS)[number])) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function parseSepayTransferWebhook(payload: Record<string, unknown>): {
  sepayTransactionId: string;
  eventId: string;
  invoiceNumber: string;
  amountMinor: bigint;
  transferType: string;
  accountNumber: string | undefined;
} | null {
  const sepayTransactionId = asString(payload.id);
  const transferType = (asString(payload.transferType) ?? asString(payload.transfer_type) ?? "").toLowerCase();
  const invoiceNumber = resolveInvoiceNumber(payload);
  const amountMinor = parseTransferAmount(payload);
  if (!sepayTransactionId || !invoiceNumber || amountMinor === null || !transferType) return null;

  return {
    sepayTransactionId,
    eventId: `transfer:${sepayTransactionId}`,
    invoiceNumber,
    amountMinor,
    transferType,
    accountNumber: asString(payload.accountNumber) ?? asString(payload.account_number),
  };
}

function verifyTransferWebhookAuth(
  request: WebhookRequest,
  options: SePayProviderOptions,
): void {
  const auth = options.webhookAuth ?? "hmac_sha256";
  if (auth === "api_key") {
    const received =
      headerValue(request.headers, "x-api-key") ??
      headerValue(request.headers, "x-sepay-api-key") ??
      headerValue(request.headers, "authorization")?.replace(/^Apikey\s+/i, "") ??
      headerValue(request.headers, "authorization")?.replace(/^Bearer\s+/i, "");
    if (!received || !options.apiKey || !safeEqualString(received.trim(), options.apiKey.trim())) {
      throw new CommerceError("WEBHOOK_INVALID", "SePay webhook API key is invalid");
    }
    return;
  }

  const received =
    headerValue(request.headers, "x-sepay-signature") ??
    headerValue(request.headers, "x-signature") ??
    headerValue(request.headers, "x-hub-signature-256");
  const signature = received?.replace(/^sha256=/i, "").trim() ?? "";
  const timestamp = headerValue(request.headers, "x-sepay-timestamp")?.trim() ?? "";
  const expectedTimestamped =
    timestamp && /^\d+$/.test(timestamp)
      ? createHmac("sha256", options.webhookSecret)
          .update(`${timestamp}.${request.rawBody}`, "utf8")
          .digest("hex")
      : "";
  const expectedRaw = createHmac("sha256", options.webhookSecret)
    .update(request.rawBody, "utf8")
    .digest("hex");

  if (!signature) {
    throw new CommerceError("WEBHOOK_INVALID", "SePay webhook signature is missing");
  }
  if (expectedTimestamped && safeEqualString(signature, expectedTimestamped)) return;
  if (safeEqualString(signature, expectedRaw)) return;
  throw new CommerceError("WEBHOOK_INVALID", "SePay webhook signature is invalid");
}

export class SePayPaymentProvider implements PaymentProvider {
  readonly id = SEPAY_PROVIDER_ID;
  readonly capabilities = SEPAY_CAPABILITIES;

  constructor(private readonly options: SePayProviderOptions) {
    if (!options.bankCode || options.bankCode.includes("CHANGE_ME")) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_BANK_CODE is required");
    }
    if (!options.bankAccountNumber || options.bankAccountNumber.includes("CHANGE_ME")) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_BANK_ACCOUNT_NUMBER is required");
    }
    if (!options.bankAccountName || options.bankAccountName.includes("CHANGE_ME")) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_BANK_ACCOUNT_NAME is required");
    }
    const auth = options.webhookAuth ?? "hmac_sha256";
    if (auth === "hmac_sha256" && (!options.webhookSecret || options.webhookSecret.includes("CHANGE_ME"))) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_WEBHOOK_SECRET is required");
    }
    if (auth === "api_key" && (!options.apiKey || options.apiKey.includes("CHANGE_ME"))) {
      throw new CommerceError("NOT_CONFIGURED", "SEPAY_API_KEY is required");
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
    const qrUrl = generateSepayQrUrl({
      accountNumber: this.options.bankAccountNumber,
      bankCode: this.options.bankCode,
      amountMinor: input.amountMinor,
      transferContent: invoice,
      qrBaseUrl: this.options.qrBaseUrl,
    });

    return {
      providerCheckoutId: invoice,
      checkoutAction: {
        mode: "qr_display",
        qrUrl,
        bankCode: this.options.bankCode,
        accountNumber: this.options.bankAccountNumber,
        accountName: this.options.bankAccountName,
        transferContent: invoice,
        amountMinor: input.amountMinor,
        currency: "VND",
      },
    };
  }

  async verifyWebhook(request: WebhookRequest): Promise<VerifiedWebhook> {
    verifyTransferWebhookAuth(request, this.options);

    let parsed: unknown;
    try {
      parsed = JSON.parse(request.rawBody) as unknown;
    } catch {
      throw new CommerceError("WEBHOOK_INVALID", "SePay webhook body is not JSON");
    }

    const payload = asRecord(parsed);
    if (!payload) {
      throw new CommerceError("WEBHOOK_INVALID", "SePay webhook payload is invalid");
    }

    const transfer = parseSepayTransferWebhook(payload);
    const sepayTransactionId = asString(payload.id) ?? "unknown";

    return {
      provider: SEPAY_PROVIDER_ID,
      eventId: transfer?.eventId ?? `transfer:${sepayTransactionId}`,
      eventType: transfer?.transferType ?? asString(payload.transferType) ?? "unknown",
      payload: sanitizeSepayTransferPayload(payload),
    };
  }

  normalizeWebhookEvent(verified: VerifiedWebhook): NormalizedCommerceEvent | null {
    const transferType = asString(verified.payload.transferType)?.toLowerCase();
    if (transferType && transferType !== "in") return null;

    const invoiceNumber = resolveInvoiceNumber(verified.payload);
    const amountRaw = verified.payload.transferAmount;
    if (!invoiceNumber || amountRaw === undefined || amountRaw === null) return null;

    let amountMinor: bigint;
    try {
      amountMinor = parseMoneyMinor(String(amountRaw));
    } catch {
      return null;
    }

    return {
      type: "payment_succeeded",
      provider: SEPAY_PROVIDER_ID,
      providerEventId: verified.eventId,
      providerPaymentId: invoiceNumber,
      amountMinor,
      currency: "VND",
      occurredAt: new Date(),
      rawType: transferType ?? "in",
      paymentMethod: "BANK_TRANSFER",
    };
  }

  async refund(_input: RefundProviderInput): Promise<RefundProviderResult> {
    throw new CommerceError(
      "UNSUPPORTED",
      "SePay QR transfers do not support automated refunds; use the manual finance workflow",
    );
  }
}
