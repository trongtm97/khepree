import { createCommerceService, type CreateCommerceServiceOverrides } from "@khepree/commerce";
import { DEFAULT_LOCALE, getEnv } from "@khepree/config";
import {
  createEntitlementOrderHandlers,
  createEntitlementService,
  type CreateEntitlementServiceOverrides,
} from "@khepree/entitlement";
import {
  createLicensingOrderHandlers,
  createLicensingService,
  type CreateLicensingServiceOverrides,
} from "@khepree/licensing";
import { createPartnerOrderHandlers } from "./order-handlers";
import { createPartnerService, type CreatePartnerServiceOverrides } from "./service";

/** @deprecated Use createKhepreePlatform from @khepree/platform. */
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
  const fallback = `${(env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/${DEFAULT_LOCALE}`;
  const partner = createPartnerService({
    ...overrides.partner,
    entitlement,
    referralBaseUrl: overrides.partner?.referralBaseUrl ?? fallback,
  });
  const commerce = createCommerceService({
    ...overrides.commerce,
    handlers: [
      ...(overrides.commerce?.handlers ?? []),
      ...createEntitlementOrderHandlers(entitlement),
      ...createLicensingOrderHandlers(entitlement),
      ...createPartnerOrderHandlers(partner),
    ],
  });
  return { commerce, entitlement, licensing, partner };
}
