import { createHmac, timingSafeEqual } from "node:crypto";
import { parseMoneyMinor } from "@khepree/types";
import { CommerceError } from "./errors";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedCommerceEvent,
  RefundProviderInput,
  RefundProviderResult,
  VerifiedWebhook,
  WebhookRequest,
} from "./types";

export interface PaymentProviderCapabilities {
  supportsOneTimePayment: boolean;
  supportsRecurring: boolean;
  supportsRefund: boolean;
  supportsPartialRefund: boolean;
  supportsVoid: boolean;
}

export interface PaymentProvider {
  readonly id: string;
  readonly capabilities: PaymentProviderCapabilities;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(request: WebhookRequest): Promise<VerifiedWebhook>;
  normalizeWebhookEvent(verified: VerifiedWebhook): NormalizedCommerceEvent | null;
  refund(input: RefundProviderInput): Promise<RefundProviderResult>;
}

export const MOCK_PROVIDER_ID = "mock";
export const MOCK_SIGNATURE_HEADER = "x-khepree-mock-signature";

export function signMockWebhook(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export class MockDevelopmentPaymentProvider implements PaymentProvider {
  readonly id = MOCK_PROVIDER_ID;
  readonly capabilities: PaymentProviderCapabilities = {
    supportsOneTimePayment: true,
    supportsRecurring: false,
    supportsRefund: true,
    supportsPartialRefund: true,
    supportsVoid: false,
  };

  constructor(
    private readonly options: {
      webhookSecret: string;
      hostedBaseUrl: string;
    },
  ) {}

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerCheckoutId = `mockpay_${input.orderPublicId}`;
    const url = new URL(`/checkout/mock/${input.orderPublicId}`, this.options.hostedBaseUrl);
    url.searchParams.set("success", input.successUrl);
    url.searchParams.set("cancel", input.cancelUrl);
    return {
      providerCheckoutId,
      checkoutAction: { mode: "redirect", url: url.toString() },
    };
  }

  async verifyWebhook(request: WebhookRequest): Promise<VerifiedWebhook> {
    const signature = headerValue(request.headers, MOCK_SIGNATURE_HEADER);
    const expected = signMockWebhook(this.options.webhookSecret, request.rawBody);
    if (!signature || !safeEqualHex(signature, expected)) {
      throw new CommerceError("WEBHOOK_INVALID", "Mock webhook signature is invalid");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(request.rawBody) as unknown;
    } catch {
      throw new CommerceError("WEBHOOK_INVALID", "Mock webhook body is not JSON");
    }

    const payload = asRecord(parsed);
    const eventId = typeof payload?.id === "string" ? payload.id : "";
    const eventType = typeof payload?.type === "string" ? payload.type : "";
    if (!payload || !eventId || !eventType) {
      throw new CommerceError("WEBHOOK_INVALID", "Mock webhook payload is missing id or type");
    }

    return {
      provider: MOCK_PROVIDER_ID,
      eventId,
      eventType,
      payload,
    };
  }

  normalizeWebhookEvent(verified: VerifiedWebhook): NormalizedCommerceEvent | null {
    const data = asRecord(verified.payload.data);
    const providerPaymentId =
      typeof data?.providerPaymentId === "string" ? data.providerPaymentId : "";
    const currency = typeof data?.currency === "string" ? data.currency : "";
    if (!data || !providerPaymentId || !currency) return null;

    let amountMinor;
    try {
      amountMinor = parseMoneyMinor(String(data.amountMinor ?? ""));
    } catch {
      return null;
    }

    const type = mockEventType(verified.eventType);
    if (!type) return null;

    return {
      type,
      provider: MOCK_PROVIDER_ID,
      providerEventId: verified.eventId,
      providerPaymentId,
      amountMinor,
      currency,
      occurredAt: new Date(),
      rawType: verified.eventType,
    };
  }

  async refund(input: RefundProviderInput): Promise<RefundProviderResult> {
    return { providerRefundId: `mockref_${input.providerPaymentId}` };
  }
}

function mockEventType(rawType: string): NormalizedCommerceEvent["type"] | null {
  switch (rawType) {
    case "payment.succeeded":
      return "payment_succeeded";
    case "payment.failed":
      return "payment_failed";
    case "payment.refunded":
      return "payment_refunded";
    case "payment.partially_refunded":
      return "payment_partially_refunded";
    default:
      return null;
  }
}
