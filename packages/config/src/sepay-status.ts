import { getEnv, type Env } from "./env";
import { isSePayConfigured, sepayIpnSecret } from "./env";

export function maskIntegrationSecret(value: string | undefined, tail = 4): string {
  if (!value?.trim()) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= tail) return "*".repeat(trimmed.length);
  return `${"*".repeat(Math.min(8, trimmed.length - tail))}${trimmed.slice(-tail)}`;
}

export type SepayIntegrationStatus = {
  paymentProvider: Env["PAYMENT_PROVIDER"];
  configured: boolean;
  env: "sandbox" | "production" | null;
  merchantIdMasked: string;
  secretKeyConfigured: boolean;
  ipnSecretConfigured: boolean;
  checkoutInitUrl: string | null;
  ipnUrl: string | null;
  accountUrl: string | null;
  productionGoLiveAcknowledged: boolean;
  missing: string[];
};

export function getSepayIntegrationStatus(env: Env = getEnv()): SepayIntegrationStatus {
  const missing: string[] = [];
  if (env.PAYMENT_PROVIDER !== "sepay") {
    missing.push("PAYMENT_PROVIDER phải là sepay");
  }
  if (!env.SEPAY_ENV) missing.push("SEPAY_ENV");
  if (!env.SEPAY_MERCHANT_ID || env.SEPAY_MERCHANT_ID.includes("CHANGE_ME")) {
    missing.push("SEPAY_MERCHANT_ID");
  }
  if (!env.SEPAY_SECRET_KEY || env.SEPAY_SECRET_KEY.includes("CHANGE_ME")) {
    missing.push("SEPAY_SECRET_KEY");
  }
  const ipn = sepayIpnSecret(env);
  if (!ipn) missing.push("SEPAY_IPN_SECRET hoặc SEPAY_SECRET_KEY");

  const apiBase = env.API_URL?.replace(/\/$/, "");
  const checkoutInitUrl =
    env.SEPAY_ENV === "production"
      ? "https://pay.sepay.vn/v1/checkout/init"
      : env.SEPAY_ENV === "sandbox"
        ? "https://pay-sandbox.sepay.vn/v1/checkout/init"
        : null;

  return {
    paymentProvider: env.PAYMENT_PROVIDER,
    configured: isSePayConfigured(env) && Boolean(ipn),
    env: env.SEPAY_ENV ?? null,
    merchantIdMasked: maskIntegrationSecret(env.SEPAY_MERCHANT_ID),
    secretKeyConfigured: Boolean(env.SEPAY_SECRET_KEY && !env.SEPAY_SECRET_KEY.includes("CHANGE_ME")),
    ipnSecretConfigured: Boolean(ipn),
    checkoutInitUrl,
    ipnUrl: apiBase ? `${apiBase}/api/v1/webhooks/payments/sepay` : null,
    accountUrl: env.ACCOUNT_URL?.replace(/\/$/, "") ?? null,
    productionGoLiveAcknowledged: env.SEPAY_ENV === "production" && env.KHEPREE_ALLOW_SEPAY_PRODUCTION === "1",
    missing,
  };
}
