import type { PlanBillingType } from "@khepree/catalog";
import type { OrderStatus, SubscriptionRecord } from "./types";

export const DESKTOP_CHECKOUT_STATUSES = [
  "PENDING",
  "PAID_PROCESSING_ACCESS",
  "ACCESS_ACTIVE",
  "FAILED",
  "CANCELLED",
] as const;

export type DesktopCheckoutStatus = (typeof DESKTOP_CHECKOUT_STATUSES)[number];

export interface DesktopCheckoutStatusInput {
  orderStatus: OrderStatus;
  productId: string;
  entitlement: {
    productId: string;
    status: string;
    planId: string | null;
  } | null;
}

export function resolveDesktopCheckoutStatus(
  input: DesktopCheckoutStatusInput,
): DesktopCheckoutStatus {
  const { orderStatus } = input;
  if (orderStatus === "cancelled") return "CANCELLED";
  if (orderStatus === "pending_payment" || orderStatus === "draft") return "PENDING";
  if (orderStatus === "voided" || orderStatus === "refunded" || orderStatus === "partially_refunded") {
    return "FAILED";
  }
  if (orderStatus !== "paid") return "FAILED";

  const entitlement = input.entitlement;
  if (!entitlement || entitlement.productId !== input.productId) {
    return "PAID_PROCESSING_ACCESS";
  }
  if (entitlement.status === "active") return "ACCESS_ACTIVE";
  if (entitlement.status === "suspended" || entitlement.status === "revoked") return "FAILED";
  if (entitlement.status === "expired") return "FAILED";
  return "PAID_PROCESSING_ACCESS";
}

export function honestAccessTermLabel(
  billingType: PlanBillingType,
  accessTermDays: number | null,
): string {
  if (billingType === "perpetual" || accessTermDays == null) return "Perpetual access";
  if (accessTermDays === 365) return "1-year access";
  if (accessTermDays === 30) return "30-day access";
  return `${accessTermDays}-day access`;
}

/** Only true when the provider returned a real recurring subscription id — never inferred from plan slug. */
export function hasHonestProviderSubscription(
  subscriptions: SubscriptionRecord[],
  productId: string,
): boolean {
  return subscriptions.some(
    (row) =>
      row.productId === productId &&
      row.status === "active" &&
      Boolean(row.providerSubscriptionId?.trim()),
  );
}
