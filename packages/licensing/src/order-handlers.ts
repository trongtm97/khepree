import type { EntitlementService } from "@khepree/entitlement";
import { principalFromCustomer } from "@khepree/entitlement";
import {
  COMMERCE_ORDER_PAID_V1,
  type CommerceOrderPaidV1,
  type DomainEventHandler,
} from "@khepree/events";

export function createLicensingOrderHandlers(entitlement: EntitlementService): DomainEventHandler[] {
  return [
    {
      eventType: COMMERCE_ORDER_PAID_V1,
      async handle(event) {
        const payload = event.payload as unknown as CommerceOrderPaidV1;
        const principal = principalFromCustomer(payload.customer);
        const resolved = await entitlement.resolveEntitlementsForPrincipal(principal);
        for (const item of payload.items) {
          const match = resolved.find(
            (row) => row.entitlement.metadata.orderItemId === item.orderItemId,
          );
          if (match) await entitlement.provisionLicenseIfRequired(match.entitlement.id);
        }
      },
    },
  ];
}
