export const COMMERCE_PACKAGE = "@khepree/commerce" as const;

export { CommerceError, isCommerceError } from "./errors";
export {
  assertOrderTransition,
  assertPaymentTransition,
  canTransitionOrder,
  canTransitionPayment,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
} from "./order-state";
export {
  MockDevelopmentPaymentProvider,
  MOCK_PROVIDER_ID,
  MOCK_SIGNATURE_HEADER,
  signMockWebhook,
  type PaymentProvider,
  type PaymentProviderCapabilities,
} from "./provider";
export {
  SePayPaymentProvider,
  SEPAY_PROVIDER_ID,
  generateSepayQrUrl,
  sepayTransferCode,
  sepayInvoiceNumber,
  SEPAY_TRANSFER_PREFIX,
  sanitizeSepayTransferPayload,
  parseSepayTransferWebhook,
} from "./sepay";
export { createCommerceService, CommerceService, addBillingInterval, createPaymentProvider } from "./service";
export type { CreateCommerceServiceOverrides } from "./service";
export {
  DESKTOP_CHECKOUT_STATUSES,
  hasHonestProviderSubscription,
  honestAccessTermLabel,
  resolveDesktopCheckoutStatus,
  type DesktopCheckoutStatus,
} from "./desktop-checkout";
export { createCommerceLifecycleHandlers } from "./outbox";
export type { CommerceRepository } from "./store";
export { MemoryCommerceRepository } from "./store";
export type {
  BillingAccount,
  CatalogReader,
  CheckoutAction,
  CheckoutFormField,
  CheckoutIntentResult,
  CommerceEventType,
  CommerceLifecycleHooks,
  CustomerOwner,
  CustomerRecord,
  NormalizedCommerceEvent,
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  PaidOrderContext,
  PaymentRecord,
  PaymentStatus,
  PurchasableOffer,
  RefundedOrderContext,
  RefundRecord,
  RefundRequestResult,
  SubscriptionRecord,
  WebhookProcessResult,
  WebhookRequest,
} from "./types";
