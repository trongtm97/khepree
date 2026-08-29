import { getEnv } from "@khepree/config";
import { createPartnerPlatform } from "@khepree/reseller";

export function getPlatform() {
  const env = getEnv();
  return createPartnerPlatform({
    commerce: { checkoutBaseUrl: env.ACCOUNT_URL || "http://localhost:3001" },
  });
}

export function getCommerce() {
  return getPlatform().commerce;
}
