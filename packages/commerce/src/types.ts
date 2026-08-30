import type { PurchasableOffer } from "@khepree/catalog";
import type { MoneyMinor } from "@khepree/types";

export type { PurchasableOffer };

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "voided";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "voided";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";

export type CustomerOwner =
  | { type: "user"; userId: string }
  | { type: "organization"; organizationId: string };

export type CommerceEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "payment_refunded"
  | "payment_partially_refunded"
  | "payment_voided";

export interface NormalizedCommerceEvent {
  type: CommerceEventType;
  provider: string;
  providerEventId: string;
  providerPaymentId: string;
  amountMinor: MoneyMinor;
  currency: string;
  occurredAt: Date;
  rawType: string;
  paymentMethod?: string;
}

export interface CustomerRecord {
  id: string;
  publicId: string;
  userId: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRecord {
  id: string;
  publicId: string;
  customerId: string;
  status: OrderStatus;
  currency: string;
  totalMinor: MoneyMinor;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  planId: string;
  priceId: string | null;
  quantity: number;
  unitAmountMinor: MoneyMinor;
  currency: string;
  productNameSnapshot: string;
  planNameSnapshot: string;
  billingIntervalSnapshot: string | null;
  accessTermDaysSnapshot: number | null;
}

export interface PaymentRecord {
  id: string;
  publicId: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amountMinor: MoneyMinor;
  currency: string;
  method: string | null;
  providerSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  publicId: string;
  customerId: string;
  planId: string;
  productId: string;
  priceId: string | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CheckoutFormField = { name: string; value: string };

export type CheckoutAction =
  | { mode: "redirect"; url: string }
  | { mode: "form_post"; action: string; fields: CheckoutFormField[] };

export interface CheckoutIntentResult {
  orderPublicId: string;
  paymentPublicId: string;
  checkoutAction: CheckoutAction;
  provider: string;
}

export interface BillingAccount {
  customer: CustomerRecord | null;
  orders: Array<OrderRecord & { items: OrderItemRecord[]; payments: PaymentRecord[] }>;
  payments: PaymentRecord[];
  subscriptions: SubscriptionRecord[];
}

export type RefundStatus = "pending" | "succeeded" | "failed" | "manual_required";

export interface RefundRecord {
  id: string;
  publicId: string;
  paymentId: string;
  provider: string;
  providerRefundId: string | null;
  amountMinor: MoneyMinor;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  initiatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogReader {
  getPurchasableOffer(
    planPublicId: string,
    pricePublicId: string,
    locale: string,
  ): Promise<PurchasableOffer | null>;
}

export interface CreateCheckoutInput {
  orderPublicId: string;
  amountMinor: MoneyMinor;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  errorUrl?: string;
  customerId?: string;
  description?: string;
  paymentMethod?: string;
}

export interface CreateCheckoutResult {
  providerCheckoutId: string;
  checkoutAction: CheckoutAction;
  /** Present only when the provider created a real recurring agreement. Not a payment id. */
  providerSubscriptionId?: string;
}

export interface RefundProviderInput {
  providerPaymentId: string;
  amountMinor: MoneyMinor;
  currency: string;
}

export interface RefundProviderResult {
  providerRefundId: string;
}

export interface WebhookRequest {
  headers: Record<string, string>;
  rawBody: string;
}

export interface VerifiedWebhook {
  provider: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export type WebhookProcessStatus = "processed" | "duplicate" | "ignored";

export interface WebhookProcessResult {
  status: WebhookProcessStatus;
  event?: NormalizedCommerceEvent;
}

/** Fired after a payment transaction commits. Hooks must be idempotent. */
export interface PaidOrderContext {
  order: OrderRecord;
  items: OrderItemRecord[];
  customer: CustomerRecord;
  payment: PaymentRecord;
  subscriptions: SubscriptionRecord[];
}

export interface RefundedOrderContext {
  order: OrderRecord;
  items: OrderItemRecord[];
  customer: CustomerRecord;
  payment: PaymentRecord;
  full: boolean;
}

export type RefundRequestResult =
  | { outcome: "completed"; payment: PaymentRecord; refund: RefundRecord }
  | { outcome: "manual_required"; payment: PaymentRecord; refund: RefundRecord };

export interface CommerceLifecycleHooks {
  afterPaid?(ctx: PaidOrderContext): Promise<void>;
  afterRefunded?(ctx: RefundedOrderContext): Promise<void>;
  afterVoided?(ctx: RefundedOrderContext): Promise<void>;
}
