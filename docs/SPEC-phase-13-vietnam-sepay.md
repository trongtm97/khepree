# Phase 13 — Vietnam-first + SePay + commerce hardening

Implementation record. Official SePay Payment Gateway docs used:

- Checkout form POST: https://developer.sepay.vn/en/cong-thanh-toan/API/don-hang/form-thanh-toan
- IPN: `X-Secret-Key` header; types `ORDER_PAID`, `TRANSACTION_VOID`
- Recurring: Coming Soon (not implemented)

## Decisions

- **No Stripe.** `PAYMENT_PROVIDER` is `mock` | `sepay`.
- **No SePay SDK dependency.** HMAC-SHA256 signing follows the official field-order spec (`packages/commerce/src/sepay.ts`).
- **No fake recurring.** One-time annual VND plans create an order + entitlement term, not a `subscriptions` row.
- **No entitlement from `success_url`.** Account success UX polls order state; IPN is authoritative.
- **SePay refunds are unsupported** in this integration. Ledger + `requestRefund()` exist; SePay `refund()` returns `UNSUPPORTED`. `TRANSACTION_VOID` applies a provider refund event without calling the provider.
- **In-memory rate limiter kept.** Multi-instance production is launch-restricted (P1) until Redis.
- **Email templates exist (VI default, EN secondary).** Adapter remains `DevPreviewEmailAdapter`. Do not claim production mail.

## Locale / money

- `DEFAULT_LOCALE = "vi"`, `SUPPORTED_LOCALES = ["vi", "en"]`
- `/` 308 → `/vi`; English at `/en`
- hreflang: `vi-VN` / `en`; `x-default` → Vietnamese
- `DEFAULT_CURRENCY = "VND"`; `currencyExponent("VND") = 0`

## Schema

Migration `0008_phase13_vietnam_sepay`: `licensing_mode`, `plans.access_term_days`, refunds ledger, `user_profiles.locale` default `vi`.

## Checkout / IPN

- `CheckoutAction`: `redirect` | `form_post`
- IPN: `POST /api/v1/webhooks/payments/sepay`
- Duplicate events: audit + 200, no hooks
- Amount/currency mismatch: 400, not paid

Sandbox operator workflow: `docs/SEPAY-SANDBOX.md`. **B1 stays open** until that workflow is proven against SePay Sandbox.
