import { getEnv, type Env } from "./env";
import { isSePayConfigured, sepayWebhookSecret } from "./env";

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
  bankCode: string | null;
  bankAccountMasked: string;
  bankAccountName: string | null;
  webhookSecretConfigured: boolean;
  webhookAuth: "hmac_sha256" | "api_key";
  qrBaseUrl: string | null;
  webhookUrl: string | null;
  accountUrl: string | null;
  productionGoLiveAcknowledged: boolean;
  missing: string[];
};

function maskAccountNumber(accountNumber: string | undefined): string {
  if (!accountNumber?.trim()) return "—";
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${"*".repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-4)}`;
}

export function getSepayIntegrationStatus(env: Env = getEnv()): SepayIntegrationStatus {
  const missing: string[] = [];
  const webhookAuth = env.SEPAY_WEBHOOK_AUTH ?? "hmac_sha256";

  if (env.PAYMENT_PROVIDER !== "sepay") {
    missing.push("PAYMENT_PROVIDER phải là sepay");
  }
  if (!env.SEPAY_BANK_CODE || env.SEPAY_BANK_CODE.includes("CHANGE_ME")) {
    missing.push("SEPAY_BANK_CODE");
  }
  if (!env.SEPAY_BANK_ACCOUNT_NUMBER || env.SEPAY_BANK_ACCOUNT_NUMBER.includes("CHANGE_ME")) {
    missing.push("SEPAY_BANK_ACCOUNT_NUMBER");
  }
  if (!env.SEPAY_BANK_ACCOUNT_NAME || env.SEPAY_BANK_ACCOUNT_NAME.includes("CHANGE_ME")) {
    missing.push("SEPAY_BANK_ACCOUNT_NAME");
  }
  if (webhookAuth === "hmac_sha256" && !sepayWebhookSecret(env)) {
    missing.push("SEPAY_WEBHOOK_SECRET");
  }
  if (webhookAuth === "api_key" && (!env.SEPAY_API_KEY || env.SEPAY_API_KEY.includes("CHANGE_ME"))) {
    missing.push("SEPAY_API_KEY");
  }

  const apiBase = env.API_URL?.replace(/\/$/, "");

  return {
    paymentProvider: env.PAYMENT_PROVIDER,
    configured: isSePayConfigured(env),
    env: env.SEPAY_ENV ?? null,
    bankCode: env.SEPAY_BANK_CODE ?? null,
    bankAccountMasked: maskAccountNumber(env.SEPAY_BANK_ACCOUNT_NUMBER),
    bankAccountName: env.SEPAY_BANK_ACCOUNT_NAME ?? null,
    webhookSecretConfigured: Boolean(sepayWebhookSecret(env)),
    webhookAuth,
    qrBaseUrl: env.SEPAY_QR_BASE_URL?.replace(/\/$/, "") ?? "https://qr.sepay.vn/img",
    webhookUrl: apiBase ? `${apiBase}/api/v1/webhooks/payments/sepay` : null,
    accountUrl: env.ACCOUNT_URL?.replace(/\/$/, "") ?? null,
    productionGoLiveAcknowledged: env.SEPAY_ENV === "production" && env.KHEPREE_ALLOW_SEPAY_PRODUCTION === "1",
    missing,
  };
}
