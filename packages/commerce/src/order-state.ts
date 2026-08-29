import { ORDER_STATUS_TRANSITIONS, PAYMENT_STATUS_TRANSITIONS } from "@khepree/db";
import { CommerceError } from "./errors";
import type { OrderStatus, PaymentStatus } from "./types";

export { ORDER_STATUS_TRANSITIONS, PAYMENT_STATUS_TRANSITIONS };

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[from] as readonly string[];
  return allowed.includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new CommerceError(
      "INVALID_TRANSITION",
      `Order cannot move from ${from} to ${to}`,
    );
  }
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  const allowed = PAYMENT_STATUS_TRANSITIONS[from] as readonly string[];
  return allowed.includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new CommerceError(
      "INVALID_TRANSITION",
      `Payment cannot move from ${from} to ${to}`,
    );
  }
}
