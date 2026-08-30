import {
  COMMERCE_ORDER_PAID_V1,
  COMMERCE_ORDER_REFUNDED_V1,
  COMMERCE_ORDER_VOIDED_V1,
  type CommerceOrderPaidV1,
  type CommerceOrderRefundedV1,
  type CommerceOrderVoidedV1,
  type DomainEventHandler,
} from "@khepree/events";
import type { EntitlementSource } from "@khepree/db";
import { EntitlementError } from "./errors";
import type { EntitlementService } from "./service";
import type { PrincipalRef } from "./types";

export function principalFromCustomer(customer: {
  userId: string | null;
  organizationId: string | null;
}): PrincipalRef {
  if (customer.userId) return { type: "USER", id: customer.userId };
  if (customer.organizationId) return { type: "ORGANIZATION", id: customer.organizationId };
  throw new EntitlementError("NOT_FOUND", "Customer has no principal");
}

function sourceFromItem(accessTermDays: number | null): EntitlementSource {
  return accessTermDays == null ? "perpetual" : "subscription";
}

export function createEntitlementOrderHandlers(entitlement: EntitlementService): DomainEventHandler[] {
  return [
    {
      eventType: COMMERCE_ORDER_PAID_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderPaidV1;
        const principal = principalFromCustomer(payload.customer);
        for (const item of payload.items) {
          await entitlement.grantEntitlement({
            principal,
            productId: item.productId,
            planId: item.planId,
            source: sourceFromItem(item.accessTermDays),
            orderPublicId: payload.orderPublicId,
            orderItemId: item.orderItemId,
            actorUserId: payload.customer.userId,
            metadata: { paymentPublicId: payload.paymentPublicId },
            provisionLicense: false,
          });
        }
      },
    },
    {
      eventType: COMMERCE_ORDER_REFUNDED_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderRefundedV1;
        await reversePurchasedAccess(entitlement, payload, "refund");
      },
    },
    {
      eventType: COMMERCE_ORDER_VOIDED_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderVoidedV1;
        await reversePurchasedAccess(
          entitlement,
          { ...payload, full: true },
          "void",
        );
      },
    },
  ];
}

async function reversePurchasedAccess(
  entitlement: EntitlementService,
  ctx: { customer: CommerceOrderPaidV1["customer"]; items: CommerceOrderPaidV1["items"]; full?: boolean },
  reason: "refund" | "void",
) {
  if (ctx.full === false) return;
  const principal = principalFromCustomer(ctx.customer);
  const resolved = await entitlement.resolveEntitlementsForPrincipal(principal);
  for (const item of ctx.items) {
    const match = resolved.find((row) => row.entitlement.metadata.orderItemId === item.orderItemId);
    if (match && match.entitlement.status !== "revoked") {
      await entitlement.suspendEntitlement({
        entitlementId: match.entitlement.id,
        actorUserId: ctx.customer.userId,
        reason,
      });
    }
  }
}

/** @deprecated Prefer createEntitlementOrderHandlers + outbox. */
export function createEntitlementCommerceHooks(entitlement: EntitlementService) {
  const handlers = createEntitlementOrderHandlers(entitlement);
  return {
    async afterPaid(ctx: {
      order: { publicId: string };
      items: Array<{
        id: string;
        productId: string;
        planId: string;
        accessTermDaysSnapshot: number | null;
      }>;
      customer: { userId: string | null; organizationId: string | null };
      payment: { publicId: string };
    }) {
      const paid = handlers.find((row) => row.eventType === COMMERCE_ORDER_PAID_V1);
      await paid?.handle({
        id: "legacy",
        publicId: `legacy_${ctx.order.publicId}`,
        eventType: COMMERCE_ORDER_PAID_V1,
        aggregateType: "order",
        aggregateId: ctx.order.publicId,
        payload: {
          orderPublicId: ctx.order.publicId,
          paymentPublicId: ctx.payment.publicId,
          customer: ctx.customer,
          currency: "VND",
          totalMinor: "0",
          items: ctx.items.map((item) => ({
            orderItemId: item.id,
            productId: item.productId,
            planId: item.planId,
            accessTermDays: item.accessTermDaysSnapshot,
          })),
          occurredAt: new Date().toISOString(),
        },
        status: "PROCESSING",
        attempts: 0,
        availableAt: new Date(),
        lockedAt: null,
        processedAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    afterRefunded: async (ctx: {
      full: boolean;
      customer: { userId: string | null; organizationId: string | null };
      items: Array<{ id: string }>;
    }) => {
      if (!ctx.full) return;
      await reversePurchasedAccess(
        entitlement,
        {
          customer: ctx.customer,
          items: ctx.items.map((item) => ({
            orderItemId: item.id,
            productId: "",
            planId: "",
            accessTermDays: null,
          })),
          full: true,
        },
        "refund",
      );
    },
    afterVoided: async (ctx: {
      customer: { userId: string | null; organizationId: string | null };
      items: Array<{ id: string }>;
    }) => {
      await reversePurchasedAccess(
        entitlement,
        {
          customer: ctx.customer,
          items: ctx.items.map((item) => ({
            orderItemId: item.id,
            productId: "",
            planId: "",
            accessTermDays: null,
          })),
          full: true,
        },
        "void",
      );
    },
  };
}
