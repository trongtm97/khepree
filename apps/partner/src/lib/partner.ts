import { getEnv } from "@khepree/config";
import { createPartnerPlatform } from "@khepree/reseller";

export function partnerAuthBaseUrl(): string {
  return getEnv().PARTNER_URL || "http://localhost:3003";
}

export function getPlatform() {
  const env = getEnv();
  return createPartnerPlatform({
    partner: { referralBaseUrl: `${env.APP_URL || "http://localhost:3000"}/en` },
  });
}

export function getPartnerService() {
  return getPlatform().partner;
}
