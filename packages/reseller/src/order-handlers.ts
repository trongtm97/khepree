import {
  COMMERCE_ORDER_PAID_V1,
  COMMERCE_ORDER_REFUNDED_V1,
  COMMERCE_ORDER_VOIDED_V1,
  type CommerceOrderPaidV1,
  type CommerceOrderRefundedV1,
  type CommerceOrderVoidedV1,
  type DomainEventHandler,
} from "@khepree/events";
import type { PartnerService } from "./service";

export function createPartnerOrderHandlers(partner: PartnerService): DomainEventHandler[] {
  return [
    {
      eventType: COMMERCE_ORDER_PAID_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderPaidV1;
        await partner.onPaidOrder({
          customer: payload.customer,
          order: {
            id: payload.orderId,
            publicId: payload.orderPublicId,
            currency: payload.currency,
            totalMinor: BigInt(payload.totalMinor),
          },
        });
      },
    },
    {
      eventType: COMMERCE_ORDER_REFUNDED_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderRefundedV1;
        if (!payload.full) return;
        await partner.onRefunded({ orderId: payload.orderId, full: true });
      },
    },
    {
      eventType: COMMERCE_ORDER_VOIDED_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderVoidedV1;
        await partner.onRefunded({ orderId: payload.orderId, full: true });
      },
    },
  ];
}
