import type { PaidOrderContext, RefundedOrderContext } from "@khepree/commerce";
import type { PartnerService } from "./service";

export function createPartnerCommerceHooks(partner: PartnerService) {
  return {
    async afterPaid(ctx: PaidOrderContext) {
      await partner.onPaidOrder(ctx);
    },
    async afterRefunded(ctx: RefundedOrderContext) {
      await partner.onRefunded(ctx);
    },
  };
}
