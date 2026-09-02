#!/usr/bin/env node
/**
 * Send a bank-transfer webhook to Khepree API (B1 validation helper).
 *
 * Usage:
 *   node scripts/integrations/sepay-send-test-ipn.mjs --code KHP12345678 --amount 599000
 *   API_URL=https://api.khepree.com SEPAY_WEBHOOK_SECRET=... node scripts/integrations/sepay-send-test-ipn.mjs --code KHP12345678
 *
 * Requires an existing pending payment with matching providerPaymentId (shown on checkout pay page).
 */

import { createHmac } from "node:crypto";

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const transferCode = readArg("--code") || (readArg("--order") ? `KHP_${readArg("--order")}` : "");
const amount = readArg("--amount", "599000");
const apiUrl = (process.env.API_URL ?? readArg("--api", "http://localhost:3005")).replace(/\/$/, "");
const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET ?? readArg("--secret");
const accountNumber = process.env.SEPAY_BANK_ACCOUNT_NUMBER ?? readArg("--account", "0123456789");

if (!transferCode) {
  console.error("Missing --code <KHP12345678> (from pending checkout pay page)");
  console.error("Legacy: --order <orderPublicId> builds KHP_<orderPublicId> for old payments");
  process.exit(1);
}
if (!webhookSecret) {
  console.error("Set SEPAY_WEBHOOK_SECRET (or --secret)");
  process.exit(1);
}

const body = {
  id: Date.now(),
  gateway: "MBBank",
  transactionDate: "2026-08-31 12:00:00",
  accountNumber,
  code: transferCode,
  content: `${transferCode} Khepree test`,
  transferType: "in",
  transferAmount: Number(amount),
};

const rawBody = JSON.stringify(body);
const signature = createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
const url = `${apiUrl}/api/v1/webhooks/payments/sepay`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-sepay-signature": signature,
  },
  body: rawBody,
});

const text = await response.text();
console.log(`POST ${url}`);
console.log(`Status: ${response.status}`);
console.log(text);

if (!response.ok) {
  process.exit(1);
}
