# Spec: Phase 07 — Commerce Foundation

## Objective

Make catalog purchases real: checkout → order → payment → **normalized commerce event**. Entitlement is not granted in this phase. The system is not locked to one payment provider.

## Assumptions

1. Existing commerce tables (`customers`, `orders`, `order_items`, `payments`, `subscriptions`, `webhook_events`) are sufficient — no new tables.
2. No Stripe credentials or project requirement exist → **MockDevelopmentPaymentProvider only**. Stripe objects never enter the domain model.
3. Checkout requires auth. Return after login uses `safeReturnPath`.
4. Organization customers are first-class in the service layer; the public checkout UI creates a **user** customer. Org checkout UI is later.
5. Redirect success URL never confirms payment or grants access. Webhooks do.
6. Recurring plans create a `subscriptions` row on payment success only.

## Commands

```
pnpm test --filter @khepree/commerce
pnpm typecheck
pnpm lint
pnpm build
```

## Project structure

```
packages/commerce/src/     domain services, provider adapter, stores
apps/api/.../webhooks/payments/[provider]   verified webhook ingress
apps/account/checkout      review + mock hosted checkout
apps/account/billing       orders, payments, subscriptions (real data)
apps/web pricing/product   checkout CTA
```

## Code style

```typescript
await commerce.confirmPayment({ paymentId });
// Stripe.PaymentIntent is not imported anywhere in domain code.
```

Money is `bigint` minor units. JSON at HTTP boundaries uses decimal digit strings.

## Testing strategy

Vitest, colocated `*.test.ts`. Critical cases (no live provider):

- invalid order transition
- payment success (order paid; subscription if recurring)
- payment failure
- refund (full and partial)
- duplicate webhook (unique provider+eventId, no double apply)

In-memory store — no Postgres required for these tests.

## Boundaries

- Always: verify webhooks before apply; persist event id uniquely; transactional apply; audit; integer money.
- Ask first: adding a live payment provider dependency (Stripe, etc.).
- Never: grant entitlement from a success URL; collect cards on Khepree pages; put provider SDK types in domain records.

## Success criteria

- `createCheckoutIntent`, `createOrder`, `markPaymentPending`, `confirmPayment`, `failPayment`, `refundPayment`, `cancelOrder` exist and enforce the order state machine.
- `PaymentProvider` is the only payment I/O surface.
- `POST /api/v1/webhooks/payments/[provider]` is verify → persist → idempotent apply → audit.
- Pricing CTA → authenticated checkout review (product, plan, price, currency, billing type, terms) → provider-hosted URL.
- `/billing` lists real orders, payments, subscriptions.
- Critical tests pass. Commerce is normalized and testable.

## Out of scope

Entitlement engine, licensing, Stripe adapter, saved cards, invoices PDF, tax, dunning, partner commissions.
