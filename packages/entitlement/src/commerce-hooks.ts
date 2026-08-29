import type { PaidOrderContext, RefundedOrderContext } from "@khepree/commerce";
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

function sourceFromItem(billingIntervalSnapshot: string | null): EntitlementSource {
  return billingIntervalSnapshot ? "subscription" : "perpetual";
}

export function createEntitlementCommerceHooks(entitlement: EntitlementService) {
  return {
    async afterPaid(ctx: PaidOrderContext) {
      const principal = principalFromCustomer(ctx.customer);
      for (const item of ctx.items) {
        const subscription = ctx.subscriptions.find(
          (row) => row.planId === item.planId && (row.status === "active" || row.status === "trialing"),
        );
        await entitlement.grantEntitlement({
          principal,
          productId: item.productId,
          planId: item.planId,
          source: sourceFromItem(item.billingIntervalSnapshot),
          expiresAt: subscription?.currentPeriodEnd ?? null,
          orderPublicId: ctx.order.publicId,
          orderItemId: item.id,
          actorUserId: ctx.customer.userId,
          metadata: { paymentPublicId: ctx.payment.publicId },
        });
      }
    },
    async afterRefunded(ctx: RefundedOrderContext) {
      if (!ctx.full) return;
      const principal = principalFromCustomer(ctx.customer);
      const resolved = await entitlement.resolveEntitlementsForPrincipal(principal);
      for (const item of ctx.items) {
        const match = resolved.find(
          (row) => row.entitlement.metadata.orderItemId === item.id,
        );
        if (match && match.entitlement.status !== "revoked") {
          await entitlement.suspendEntitlement({
            entitlementId: match.entitlement.id,
            actorUserId: ctx.customer.userId,
            reason: "refund",
          });
        }
      }
    },
  };
}
