#!/usr/bin/env node
/**
 * Send a sandbox ORDER_PAID IPN to Khepree API (B1 validation helper).
 *
 * Usage:
 *   node scripts/integrations/sepay-send-test-ipn.mjs --order ord_xxx --amount 599000
 *   API_URL=https://api.khepree.com SEPAY_IPN_SECRET=... node scripts/integrations/sepay-send-test-ipn.mjs --order ord_xxx
 *
 * Requires an existing pending payment with providerPaymentId KHP_<orderPublicId>.
 */

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const orderPublicId = readArg("--order");
const amount = readArg("--amount", "599000");
const apiUrl = (process.env.API_URL ?? readArg("--api", "http://localhost:3005")).replace(/\/$/, "");
const ipnSecret = process.env.SEPAY_IPN_SECRET ?? process.env.SEPAY_SECRET_KEY ?? readArg("--secret");

if (!orderPublicId) {
  console.error("Missing --order <orderPublicId> (pending checkout required)");
  process.exit(1);
}
if (!ipnSecret) {
  console.error("Set SEPAY_IPN_SECRET or SEPAY_SECRET_KEY (or --secret)");
  process.exit(1);
}

const invoice = `KHP_${orderPublicId}`;
const transactionId = `test_${Date.now()}`;
const body = {
  timestamp: Math.floor(Date.now() / 1000),
  notification_type: "ORDER_PAID",
  order: {
    id: crypto.randomUUID(),
    order_id: `TEST_${transactionId}`,
    order_status: "CAPTURED",
    order_currency: "VND",
    order_amount: `${amount}.00`,
    order_invoice_number: invoice,
    order_description: "Khepree sandbox IPN test",
  },
  transaction: {
    id: crypto.randomUUID(),
    payment_method: "BANK_TRANSFER",
    transaction_id: transactionId,
    transaction_type: "PAYMENT",
    transaction_status: "APPROVED",
    transaction_amount: String(amount),
    transaction_currency: "VND",
  },
};

const url = `${apiUrl}/api/v1/webhooks/payments/sepay`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Secret-Key": ipnSecret,
  },
  body: JSON.stringify(body),
});

const text = await response.text();
console.log(`POST ${url}`);
console.log(`Status: ${response.status}`);
console.log(text);

if (!response.ok) {
  process.exit(1);
}
