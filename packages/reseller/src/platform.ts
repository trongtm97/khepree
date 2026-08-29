import { createCommerceService, type CreateCommerceServiceOverrides } from "@khepree/commerce";
import { getEnv } from "@khepree/config";
import {
  createEntitlementCommerceHooks,
  createEntitlementService,
  type CreateEntitlementServiceOverrides,
} from "@khepree/entitlement";
import { createLicensingService, type CreateLicensingServiceOverrides } from "@khepree/licensing";
import { createPartnerCommerceHooks } from "./commerce-hooks";
import { createPartnerService, type CreatePartnerServiceOverrides } from "./service";

export function createPartnerPlatform(
  overrides: {
    entitlement?: CreateEntitlementServiceOverrides;
    licensing?: CreateLicensingServiceOverrides;
    commerce?: CreateCommerceServiceOverrides;
    partner?: Omit<CreatePartnerServiceOverrides, "entitlement">;
  } = {},
) {
  const entitlement =
    overrides.licensing?.entitlement ?? createEntitlementService(overrides.entitlement);
  const licensing = createLicensingService({ ...overrides.licensing, entitlement });
  const env = getEnv();
  const partner = createPartnerService({
    ...overrides.partner,
    entitlement,
    referralBaseUrl: overrides.partner?.referralBaseUrl ?? env.APP_URL ?? "http://localhost:3000",
  });
  const entitlementHooks = createEntitlementCommerceHooks(entitlement);
  const partnerHooks = createPartnerCommerceHooks(partner);
  const commerce = createCommerceService({
    ...overrides.commerce,
    hooks: overrides.commerce?.hooks ?? {
      async afterPaid(ctx) {
        await entitlementHooks.afterPaid?.(ctx);
        await partnerHooks.afterPaid(ctx);
      },
      async afterRefunded(ctx) {
        await entitlementHooks.afterRefunded?.(ctx);
        await partnerHooks.afterRefunded(ctx);
      },
    },
  });
  return { commerce, entitlement, licensing, partner };
}
