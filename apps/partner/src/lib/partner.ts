import { getEnv } from "@khepree/config";
import { createKhepreePlatform } from "@khepree/platform";

export function partnerAuthBaseUrl(): string {
  return getEnv().PARTNER_URL || "http://localhost:3003";
}

export function getPlatform() {
  const env = getEnv();
  return createKhepreePlatform({
    partner: { referralBaseUrl: `${(env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/vi` },
  });
}

export function getPartnerService() {
  return getPlatform().partner;
}
