import { createCommerceService, type CreateCommerceServiceOverrides } from "@khepree/commerce";
import { DEFAULT_LOCALE, getEnv } from "@khepree/config";
import {
  createDesktopAuthService,
  type CreateDesktopAuthServiceOverrides,
} from "@khepree/desktop-auth";
import {
  createEntitlementOrderHandlers,
  createEntitlementService,
  type CreateEntitlementServiceOverrides,
} from "@khepree/entitlement";
import { createLicensingOrderHandlers, createLicensingService, type CreateLicensingServiceOverrides } from "@khepree/licensing";
import {
  createPartnerOrderHandlers,
  createPartnerService,
  type CreatePartnerServiceOverrides,
} from "@khepree/reseller";

export type CreateKhepreePlatformOverrides = {
  entitlement?: CreateEntitlementServiceOverrides;
  licensing?: CreateLicensingServiceOverrides;
  desktopAuth?: CreateDesktopAuthServiceOverrides;
  commerce?: CreateCommerceServiceOverrides;
  partner?: Omit<CreatePartnerServiceOverrides, "entitlement">;
};

export function marketingReferralBaseUrl(appUrl: string, locale = DEFAULT_LOCALE): string {
  return `${appUrl.replace(/\/$/, "")}/${locale}`;
}

/**
 * Composition root. Dependency direction:
 * platform → catalog, commerce, entitlement, licensing, reseller, events
 * reseller does not import platform (no cycle).
 */
export function createKhepreePlatform(
  overrides: CreateKhepreePlatformOverrides = {},
) {
  const entitlement =
    overrides.licensing?.entitlement ?? createEntitlementService(overrides.entitlement);
  const desktopAuth = createDesktopAuthService({
    ...overrides.desktopAuth,
    entitlement: overrides.desktopAuth?.entitlement ?? entitlement,
  });
  const licensing = createLicensingService({
    ...overrides.licensing,
    entitlement,
    sessionRevoker: overrides.licensing?.sessionRevoker ?? {
      revokeSessionsForDevice: (deviceId, reason) =>
        desktopAuth.revokeSessionsForDevice(deviceId, reason),
    },
  });
  const env = getEnv();
  const partner = createPartnerService({
    ...overrides.partner,
    entitlement,
    referralBaseUrl:
      overrides.partner?.referralBaseUrl ??
      marketingReferralBaseUrl(env.APP_URL ?? "http://localhost:3000"),
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
  return { commerce, entitlement, licensing, partner, desktopAuth };
}
