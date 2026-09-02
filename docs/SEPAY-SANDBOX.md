# SePay VietQR validation

Operator checklist for **SePay bank-transfer QR** (same model as CHAPMEE). Do not mark `docs/TODOS.md` B1 resolved until every item below has been observed with a reachable webhook URL.

Official references:

- QR + webhook: https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook
- VietQR image: https://developer.sepay.vn/vi/tien-ich-khac/tao-qr-code

## Required environment

```
PAYMENT_PROVIDER=sepay
SEPAY_BANK_CODE=MBBank
SEPAY_BANK_ACCOUNT_NUMBER=<account>
SEPAY_BANK_ACCOUNT_NAME=<name>
SEPAY_WEBHOOK_SECRET=<hmac secret from SePay dashboard>
# or API key auth:
# SEPAY_WEBHOOK_AUTH=api_key
# SEPAY_API_KEY=<api key>

ACCOUNT_URL=https://<public-account-host>
API_URL=https://<public-api-host>
```

Register webhook on SePay dashboard:

`https://<public-api-host>/api/v1/webhooks/payments/sepay`

Configure payment code prefix **`KHP`** on SePay (Company → General → Payment code structure): prefix `KHP`, suffix **6–8 digits** (digits only). Transfer content is a short code like `KHP12345678` (11 characters).

### Simulate webhook (after a pending checkout exists)

```bash
API_URL=https://api.khepree.com SEPAY_WEBHOOK_SECRET=<secret> \
  node scripts/integrations/sepay-send-test-ipn.mjs --code KHP12345678 --amount 599000
```

Expect HTTP 200 and `{"success":true}`. Verify in admin **Bán hàng → SePay → Webhook gần đây**.

## Happy path

1. Open marketing `/` → land on `/vi`.
2. Open a product / pricing page. Choose a **VND** plan (region VN).
3. Sign in on account. Checkout review shows Vietnamese copy.
4. Submit checkout → account `/checkout/pay/{orderPublicId}` shows VietQR + bank details.
5. Transfer exact amount with content shown on the pay page (e.g. `KHP12345678`).
6. Confirm webhook: payment `succeeded`, order `paid`, entitlement active.
7. License exists **only** if the product `licensingMode` is `LICENSE_KEY_DEVICE` or `DEVICE_LEASE`.
8. Account billing lists the order with VND formatting.

## Edge cases

| Scenario | Expected |
|----------|----------|
| User closes pay page before transfer | Order stays `pending_payment`; can reopen `/checkout/pay/{orderPublicId}` |
| Duplicate webhook | HTTP 200 `{success:true}`, no second entitlement/email/commission |
| Amount mismatch | HTTP 400, order stays pending |
| Wrong transfer content | Webhook ignored (200), order stays pending |
