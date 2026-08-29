import { DOMAINS, getEnv } from "@khepree/config";

/** Account app URL for public CTAs — never invent a host. */
export function accountPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ACCOUNT_URL ||
    getEnv().ACCOUNT_URL ||
    `https://${DOMAINS.account}`
  );
}
