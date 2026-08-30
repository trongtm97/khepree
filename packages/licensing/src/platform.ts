import { createCommerceService, type CreateCommerceServiceOverrides } from "@khepree/commerce";
import {
  createEntitlementOrderHandlers,
  createEntitlementService,
  type CreateEntitlementServiceOverrides,
} from "@khepree/entitlement";
import { createLicensingOrderHandlers } from "./order-handlers";
import { createLicensingService, type CreateLicensingServiceOverrides } from "./service";

/** Shared factory so webhooks and account grant entitlements the same way. Prefer createKhepreePlatform. */
export function createLicensingPlatform(overrides: {
  entitlement?: CreateEntitlementServiceOverrides;
  licensing?: CreateLicensingServiceOverrides;
  commerce?: CreateCommerceServiceOverrides;
} = {}) {
  const entitlement =
    overrides.licensing?.entitlement ?? createEntitlementService(overrides.entitlement);
  const licensing = createLicensingService({ ...overrides.licensing, entitlement });
  const commerce = createCommerceService({
    ...overrides.commerce,
    handlers: [
      ...(overrides.commerce?.handlers ?? []),
      ...createEntitlementOrderHandlers(entitlement),
      ...createLicensingOrderHandlers(entitlement),
    ],
  });
  return { commerce, entitlement, licensing };
}
