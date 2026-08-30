/** Versioned durable domain contracts. Payloads are DTOs, never DB rows or secrets. */

export const COMMERCE_ORDER_PAID_V1 = "commerce.order.paid.v1" as const;
export const COMMERCE_ORDER_REFUNDED_V1 = "commerce.order.refunded.v1" as const;
export const COMMERCE_ORDER_VOIDED_V1 = "commerce.order.voided.v1" as const;

export type CommerceEventTypeV1 =
  | typeof COMMERCE_ORDER_PAID_V1
  | typeof COMMERCE_ORDER_REFUNDED_V1
  | typeof COMMERCE_ORDER_VOIDED_V1;

export interface CommerceOrderItemV1 {
  orderItemId: string;
  productId: string;
  planId: string;
  accessTermDays: number | null;
}

export interface CommerceCustomerRefV1 {
  userId: string | null;
  organizationId: string | null;
}

export interface CommerceOrderPaidV1 {
  orderId: string;
  orderPublicId: string;
  paymentPublicId: string;
  customer: CommerceCustomerRefV1;
  currency: string;
  totalMinor: string;
  items: CommerceOrderItemV1[];
  occurredAt: string;
}

export interface CommerceOrderRefundedV1 {
  orderId: string;
  orderPublicId: string;
  paymentPublicId: string;
  refundPublicId: string;
  customer: CommerceCustomerRefV1;
  full: boolean;
  amountMinor: string;
  currency: string;
  items: CommerceOrderItemV1[];
  occurredAt: string;
}

export interface CommerceOrderVoidedV1 {
  orderId: string;
  orderPublicId: string;
  paymentPublicId: string;
  customer: CommerceCustomerRefV1;
  items: CommerceOrderItemV1[];
  occurredAt: string;
}

export function commerceOrderPaidEventId(orderPublicId: string): string {
  return `evt_cop_${orderPublicId}`;
}

export function commerceOrderRefundedEventId(refundPublicId: string): string {
  return `evt_cor_${refundPublicId}`;
}

export function commerceOrderVoidedEventId(orderPublicId: string): string {
  return `evt_cov_${orderPublicId}`;
}
