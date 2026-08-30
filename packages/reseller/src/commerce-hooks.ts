import type { PaidOrderContext, RefundedOrderContext } from "@khepree/commerce";
import type { PartnerService } from "./service";

/** @deprecated Prefer createPartnerOrderHandlers (durable outbox). */
export function createPartnerCommerceHooks(partner: PartnerService) {
  return {
    async afterPaid(ctx: PaidOrderContext) {
      await partner.onPaidOrder({
        customer: { userId: ctx.customer.userId, organizationId: ctx.customer.organizationId },
        order: {
          id: ctx.order.id,
          publicId: ctx.order.publicId,
          currency: ctx.order.currency,
          totalMinor: ctx.order.totalMinor,
        },
      });
    },
    async afterRefunded(ctx: RefundedOrderContext) {
      await partner.onRefunded({ orderId: ctx.order.id, full: ctx.full });
    },
  };
}
