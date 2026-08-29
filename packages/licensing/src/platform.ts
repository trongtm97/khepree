import { createCommerceService, type CreateCommerceServiceOverrides } from "@khepree/commerce";
import {
  createEntitlementCommerceHooks,
  createEntitlementService,
  type CreateEntitlementServiceOverrides,
} from "@khepree/entitlement";
import { createLicensingService, type CreateLicensingServiceOverrides } from "./service";

/** Shared factory so webhooks and account grant entitlements the same way. */
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
    hooks: overrides.commerce?.hooks ?? createEntitlementCommerceHooks(entitlement),
  });
  return { commerce, entitlement, licensing };
}
