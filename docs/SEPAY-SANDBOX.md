# SePay Sandbox validation

This is an operator checklist, not a passing CI job. Do not mark `docs/TODOS.md` B1 resolved until every item below has been observed against **SePay Sandbox** with a reachable IPN URL.

Official references:

- Checkout form: https://developer.sepay.vn/en/cong-thanh-toan/API/don-hang/form-thanh-toan
- IPN uses `X-Secret-Key`. Recurring is not available.

## Required environment

```
NODE_ENV=development
PAYMENT_PROVIDER=sepay
SEPAY_ENV=sandbox
SEPAY_MERCHANT_ID=<sandbox merchant>
SEPAY_SECRET_KEY=<sandbox secret>
# optional if IPN secret equals merchant secret:
# SEPAY_IPN_SECRET=

ACCOUNT_URL=https://<public-account-host>
API_URL=https://<public-api-host>
```

SePay must be able to POST to:

`https://<public-api-host>/api/v1/webhooks/payments/sepay`

Localhost is not sufficient unless you expose that path with a tunnel (ngrok, Cloudflare Tunnel, etc.).

### Simulate IPN (after a pending checkout exists)

```bash
# Pending order from checkout — replace ord_... with real public id
API_URL=https://api.khepree.com SEPAY_IPN_SECRET=<secret> \
  node scripts/integrations/sepay-send-test-ipn.mjs --order ord_xxxxxxxx --amount 599000
```

Expect HTTP 200 and `status: processed` (or `duplicate` on retry). Verify in admin **Bán hàng → SePay → IPN gần đây**.

## Happy path

1. Open marketing `/` → land on `/vi`.
2. Open a product / pricing page. Choose a **VND** plan (region VN).
3. Sign in on account. Checkout review shows Vietnamese copy.
4. Submit checkout → account `/checkout/pay/{orderPublicId}` auto-POSTs signed fields to `pay-sandbox.sepay.vn` in official order (`order_amount` … `signature` last; optional `customer_id` / `payment_method` do not move callback URLs).
5. Complete the sandbox payment.
6. Confirm IPN: payment `succeeded`, order `paid`, entitlement active.
7. License exists **only** if the product `licensingMode` is `LICENSE_KEY_DEVICE` or `DEVICE_LEASE`.
8. Account billing lists the order with VND formatting.

## Negative / race cases

| Case | Expected |
|------|----------|
| Success redirect arrives before IPN | Billing shows “Đang xác nhận thanh toán”. No entitlement yet. |
| Duplicate IPN | HTTP 200, `duplicate`, no second entitlement/email/commission. |
| `TRANSACTION_VOID` | Payment and order become `voided` (UI: “Đã hủy giao dịch” / “Voided”). No refunds-ledger row. Access reversed once. Not “Hoàn tiền”. |
| Invalid `X-Secret-Key` | HTTP 400. Order stays unpaid. |
| Amount mismatch | HTTP 400. Order stays unpaid. |
| Currency mismatch | HTTP 400. Order stays unpaid. |

## Out of scope

- Production `SEPAY_ENV=production`
- SePay recurring / subscriptions
- Automated SePay refunds (manual finance via `manual_required` + `confirmManualRefund`)
- Marking the project production-ready
- Treating `TRANSACTION_VOID` as a refund
