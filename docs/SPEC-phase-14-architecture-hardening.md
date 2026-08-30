# Spec: Phase 14 — Platform-wide architecture and reliability hardening

## Objective

Harden the modular monolith after Phase 13/13.1 so paid orders, entitlements, licensing, partner effects, and audit cannot be lost to post-commit hook failure. No product features, no microservices, no new payment provider, no stack replacements.

## Capability map

| Module id | Responsibility | Depends on |
|-----------|----------------|------------|
| domain-events | Versioned event DTOs | types |
| outbox | `outbox_events` + polling dispatcher + retry | db, domain-events |
| audit-tx | Transaction-bound append-only audit | db |
| platform | `createKhepreePlatform()` composition root | catalog, commerce, entitlement, licensing, reseller, events, db |
| entitlement-handlers | Grant/suspend from durable events; licenses only when mode requires | events, entitlement, licensing |
| partner-correctness | VND wallets, locale URLs, access-term policy, explicit partner context, atomic issue | reseller, entitlement, catalog |
| commerce-split | Internal Order/Checkout/Payment/Refund/Webhook/Subscription files | commerce |
| cms-media | Version allocation, storage recovery, BIGINT sizes, upload classes | catalog, storage, db |
| market-policy | Server-side PriceSelection/MarketPolicy | catalog, config |
| auth-rate-email | Request-scoped session memo, RateLimiter+Redis, provider-extensible payments, Resend | auth, security, config, email |
| ci-docs | Postgres integration job, E2E workflow, turbo, source-of-truth docs | — |

Build order: domain-events → outbox + audit-tx → entitlement-handlers → platform → partner-correctness → remaining modules.

## Success criteria

- Payment/order transition and outbox insert share one PostgreSQL transaction.
- Hook failure after commit cannot strand a paid order without a retryable outbox row.
- Apps compose via `@khepree/platform`; `@khepree/reseller` is partner domain only.
- Partner issue/renew uses `nextExpiresAt` / `plan.accessTermDays`.
- Partner operations take an explicit partner id; `memberships[0]` is not implicit active context.
- Production email never silently uses DevPreview.
- CI has a separate Postgres integration job; unit CI stays DB-less.
- Docs match source. Not claimed production-ready.

## Boundaries

- Always: same-tx outbox for critical commerce effects; integer money; feature-based entitlement; append-only audit.
- Never: Kafka/RabbitMQ, new PSP, microservices, geo-IP pricing, production-ready claim without B1/email/infra.

## Audit notes (source over docs)

- `origin/main` is Phase 13 (`77dbb09`). Phase 13.1 exists as uncommitted working-tree changes (migration `0009`).
- README phase table still stops at 12; ARCHITECTURE/PRODUCTION-STATUS already describe 13.1 locally.
