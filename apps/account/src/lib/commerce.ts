import { getEnv } from "@khepree/config";
import { createKhepreePlatform } from "@khepree/platform";

export function getPlatform() {
  const env = getEnv();
  return createKhepreePlatform({
    commerce: { checkoutBaseUrl: env.ACCOUNT_URL || "http://localhost:3001" },
  });
}

export function getCommerce() {
  return getPlatform().commerce;
}
