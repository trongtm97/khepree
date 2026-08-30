import {
  COMMERCE_ORDER_PAID_V1,
  COMMERCE_ORDER_REFUNDED_V1,
  COMMERCE_ORDER_VOIDED_V1,
  commerceOrderPaidEventId,
  commerceOrderRefundedEventId,
  commerceOrderVoidedEventId,
  type CommerceOrderItemV1,
  type CommerceOrderPaidV1,
  type CommerceOrderRefundedV1,
  type CommerceOrderVoidedV1,
  type DomainEventHandler,
} from "@khepree/events";
import { getRequestIdFromContext } from "./request-context";
import type { CommerceRepository } from "./store";
import type {
  CommerceLifecycleHooks,
  CustomerRecord,
  OrderItemRecord,
  OrderRecord,
  PaymentRecord,
} from "./types";

function itemDto(item: OrderItemRecord): CommerceOrderItemV1 {
  return {
    orderItemId: item.id,
    productId: item.productId,
    planId: item.planId,
    accessTermDays: item.accessTermDaysSnapshot,
  };
}

function customerRef(customer: CustomerRecord) {
  return { userId: customer.userId, organizationId: customer.organizationId };
}

function withCorrelation(payload: Record<string, unknown>): Record<string, unknown> {
  const requestId = getRequestIdFromContext();
  if (!requestId) return payload;
  return { ...payload, _correlation: { requestId } };
}

export async function enqueueOrderPaid(
  repo: CommerceRepository,
  input: {
    order: OrderRecord;
    payment: PaymentRecord;
    customer: CustomerRecord;
    items: OrderItemRecord[];
    occurredAt: Date;
  },
): Promise<void> {
  const payload: CommerceOrderPaidV1 = {
    orderId: input.order.id,
    orderPublicId: input.order.publicId,
    paymentPublicId: input.payment.publicId,
    customer: customerRef(input.customer),
    currency: input.order.currency,
    totalMinor: input.order.totalMinor.toString(),
    items: input.items.map(itemDto),
    occurredAt: input.occurredAt.toISOString(),
  };
  await repo.enqueueOutbox({
    publicId: commerceOrderPaidEventId(input.order.publicId),
    eventType: COMMERCE_ORDER_PAID_V1,
    aggregateType: "order",
    aggregateId: input.order.publicId,
    payload: withCorrelation(payload as unknown as Record<string, unknown>),
  });
}

export async function enqueueOrderRefunded(
  repo: CommerceRepository,
  input: {
    order: OrderRecord;
    payment: PaymentRecord;
    refundPublicId: string;
    customer: CustomerRecord;
    items: OrderItemRecord[];
    full: boolean;
    amountMinor: bigint;
    occurredAt: Date;
  },
): Promise<void> {
  const payload: CommerceOrderRefundedV1 = {
    orderId: input.order.id,
    orderPublicId: input.order.publicId,
    paymentPublicId: input.payment.publicId,
    refundPublicId: input.refundPublicId,
    customer: customerRef(input.customer),
    full: input.full,
    amountMinor: input.amountMinor.toString(),
    currency: input.order.currency,
    items: input.items.map(itemDto),
    occurredAt: input.occurredAt.toISOString(),
  };
  await repo.enqueueOutbox({
    publicId: commerceOrderRefundedEventId(input.refundPublicId),
    eventType: COMMERCE_ORDER_REFUNDED_V1,
    aggregateType: "order",
    aggregateId: input.order.publicId,
    payload: withCorrelation(payload as unknown as Record<string, unknown>),
  });
}

export async function enqueueOrderVoided(
  repo: CommerceRepository,
  input: {
    order: OrderRecord;
    payment: PaymentRecord;
    customer: CustomerRecord;
    items: OrderItemRecord[];
    occurredAt: Date;
  },
): Promise<void> {
  const payload: CommerceOrderVoidedV1 = {
    orderId: input.order.id,
    orderPublicId: input.order.publicId,
    paymentPublicId: input.payment.publicId,
    customer: customerRef(input.customer),
    items: input.items.map(itemDto),
    occurredAt: input.occurredAt.toISOString(),
  };
  await repo.enqueueOutbox({
    publicId: commerceOrderVoidedEventId(input.order.publicId),
    eventType: COMMERCE_ORDER_VOIDED_V1,
    aggregateType: "order",
    aggregateId: input.order.publicId,
    payload: withCorrelation(payload as unknown as Record<string, unknown>),
  });
}

async function loadOrderContext(
  store: CommerceRepository,
  event: { aggregateId: string; payload: Record<string, unknown> },
) {
  const payload = event.payload as { orderPublicId?: string; paymentPublicId?: string; full?: boolean };
  const order = await store.getOrderByPublicId(payload.orderPublicId ?? event.aggregateId);
  if (!order) return null;
  const customer = await store.getCustomerById(order.customerId);
  const payments = await store.listPaymentsByOrder(order.id);
  const payment = payments.find((row) => row.publicId === payload.paymentPublicId) ?? payments[0];
  if (!customer || !payment) return null;
  const items = await store.listOrderItems(order.id);
  return { order, customer, payment, items, full: payload.full === true };
}

/** Adapts legacy lifecycle hooks to durable outbox handlers. */
export function createCommerceLifecycleHandlers(
  store: CommerceRepository,
  hooks: CommerceLifecycleHooks,
): DomainEventHandler[] {
  const handlers: DomainEventHandler[] = [];
  if (hooks.afterPaid) {
    const afterPaid = hooks.afterPaid;
    handlers.push({
      eventType: COMMERCE_ORDER_PAID_V1,
      async handle(event) {
        const ctx = await loadOrderContext(store, event);
        if (!ctx) return;
        const subscriptions = await store.listSubscriptionsByCustomer(ctx.order.customerId);
        await afterPaid({
          order: ctx.order,
          items: ctx.items,
          customer: ctx.customer,
          payment: ctx.payment,
          subscriptions,
        });
      },
    });
  }
  if (hooks.afterRefunded) {
    const afterRefunded = hooks.afterRefunded;
    handlers.push({
      eventType: COMMERCE_ORDER_REFUNDED_V1,
      async handle(event) {
        const ctx = await loadOrderContext(store, event);
        if (!ctx) return;
        await afterRefunded({
          order: ctx.order,
          items: ctx.items,
          customer: ctx.customer,
          payment: ctx.payment,
          full: ctx.full,
        });
      },
    });
  }
  if (hooks.afterVoided) {
    const afterVoided = hooks.afterVoided;
    handlers.push({
      eventType: COMMERCE_ORDER_VOIDED_V1,
      async handle(event) {
        const ctx = await loadOrderContext(store, event);
        if (!ctx) return;
        await afterVoided({
          order: ctx.order,
          items: ctx.items,
          customer: ctx.customer,
          payment: ctx.payment,
          full: true,
        });
      },
    });
  }
  return handlers;
}

