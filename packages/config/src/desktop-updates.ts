import { getEnv, type Env } from "./env";

/** Products whose update binaries may download without entitlement (session still required). */
export function isDesktopPublicUpdateProduct(productId: string, env: Env = getEnv()): boolean {
  const allowlist = (env.DESKTOP_PUBLIC_UPDATE_PRODUCT_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allowlist.includes(productId);
}
