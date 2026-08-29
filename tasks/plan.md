# Implementation Plan: Phase 07 Commerce Foundation

## Overview

Implement `@khepree/commerce` against the existing schema. Mock payment provider first. Wire webhook API, checkout, and billing UI. Do not start Phase 08/09.

## Architecture decisions

- Provider adapter (`PaymentProvider`) is the only payment I/O. Domain records store `provider` + `providerPaymentId` strings.
- Checkout intent = draft order + provider checkout + pending payment. No extra table.
- Webhook uniqueness is `(provider, eventId)`. Apply inside the same transaction as the insert when possible; handlers are retry-safe and idempotent.
- Tests use an in-memory store so critical money paths do not need Postgres.

## Task list

1. Domain: order/payment transitions + `PaymentProvider` + mock + repository + services
2. Catalog `getPurchasableOffer`; config env; auth `/checkout` return path
3. API webhook route
4. Account checkout + mock hosted page + billing
5. Web pricing/product CTA
6. Docs (ARCHITECTURE, AGENTS)

## Risks

| Risk | Mitigation |
|------|------------|
| Confirming payment from redirect | Return URL is informational only; tests prove webhook path |
| Double charge on webhook retry | Unique event id + idempotent confirm/fail/refund |
| Stripe leaking into domain | No Stripe dependency in this phase |
