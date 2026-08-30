# Production status (Phase 14)

This is an inventory, not a launch certificate. **Khepree is not production-ready** while any BLOCKER in `docs/TODOS.md` remains open. Compiling Phase 14 does not mean go-live. SePay B1 sandbox proof is **not** resolved. Real email delivery is **not** verified. Production infrastructure and backup/restore drills do not exist in this repo.

## 1. Current architecture tree

```
apps/
  web          khepree.com           marketing, catalog, blog, docs, legal (vi default)
  account      account.khepree.com   identity, checkout, licenses, billing
  admin        admin.khepree.com     staff RBAC, domain commands, audit
  partner      partner.khepree.com   referral / reseller (`/p/{partnerPublicId}/…`)
  api          api.khepree.com       HTTP APIs (SePay IPN: /api/v1/webhooks/payments/sepay)
  e2e          Playwright            optional, E2E=1
packages/
  platform     createKhepreePlatform() composition root
  events       domain contracts + outbox dispatcher
  auth         Better Auth (identity only)
  catalog      products, plans, features, CMS, media, market policy
  commerce     orders, payments, refunds ledger, mock + SePay, same-tx outbox
  config       env, domains, logger, validation
  db           Drizzle schema + migrations 0000–0010
  email        DevPreview + Resend HTTP adapter + VI/EN templates
  entitlement   feature grants (source of truth for access)
  licensing    keys, devices, Ed25519 leases (only when licensingMode requires)
  reseller     partners, wallet, referrals (domain only)
  sdk          client-neutral types
  security     RBAC, RateLimiter (memory + Redis interface), trusted-proxy IP
  storage      public/private object storage + upload content classes
  types        money (VND exponent 0) and shared contracts
  ui           design system
```

## 2. Implemented capabilities

- Transactional outbox: payment/order transition and `outbox_events` insert share one PostgreSQL transaction. Paid-order provisioning is retryable; duplicate webhooks do not lose the event.
- Apps compose via `@khepree/platform`. `@khepree/reseller` is partner domain behavior.
- Audit writers can `bind(tx)` so audit rows roll back with the business transaction.
- Partner: VND wallets, `/vi` referral URLs, `accessTermDays`, explicit partner context, drizzle atomic issue.
- CMS: version allocation retries unique conflicts; compensating delete after failed metadata write; `media_assets.size_bytes` is BIGINT.
- Server-side `MarketPolicy` (default VN/VND). Production payment env is provider-extensible; mock is forbidden.
- Email: `ResendEmailAdapter` behind the existing interface. Production fails closed on `EMAIL_PROVIDER=dev`. Delivery is not proven.
- CI: unit job (no DB) + Postgres integration job (migrate from empty + tests). E2E is a separate workflow_dispatch workflow. Turbo lint/typecheck/test do not require `^build`.

## 3. Missing production credentials

Must be created **outside** the repo (never committed):

- `DATABASE_URL` (production Postgres)
- `BETTER_AUTH_SECRET`, production `BETTER_AUTH_URL`
- `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY` (see `docs/LICENSE-SIGNING.md`)
- R2 (or S3-compatible) account, keys, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_PUBLIC_BASE_URL`
- `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, `EMAIL_PROVIDER_API_KEY` **and** a passing live send test
- SePay production credentials after B1 sandbox proof
- Optional `REDIS_URL` for multi-instance rate limits
- OAuth client secrets if Google sign-in is enabled

## 4. Required external configuration

- DNS + TLS for hostnames in `docs/DEPLOYMENT.md`
- Separate preview vs production resources (`docs/ENVIRONMENTS.md`)
- Public IPN URL for SePay (`docs/SEPAY-SANDBOX.md`)
- Bucket CORS/lifecycle if browser uploads or retention rules apply (`docs/R2.md`)
- OAuth redirect URIs, email domain authentication (SPF/DKIM) when email is real
- Backup schedule for Postgres and objects
- Cloudflare: set `TRUSTED_PROXY=cloudflare` so rate limits use `CF-Connecting-IP` only

## 5. Database migrations status

Applied set in repo: `0000` … `0010_phase14_reliability`. Production is **not** migrated until an operator runs `pnpm db:migrate` against the production URL. Do not `pnpm db:seed` in production.

## 6. Security status

Addressed through Phase 14: same-tx outbox, tx-bound audit, upload content classes, market price gate, request-scoped session memo, Redis rate-limit interface, production email fail-closed, provider-extensible payment env validation.

Still open for launch: B1–B6 and P1–P10 in `docs/TODOS.md`. Redis limiter is an interface until `REDIS_URL` is wired at composition. Email adapter is not proven against Resend. CSP allows unsafe-inline. SePay recurring and automated refunds are **not** implemented.

## 7. Test status

`pnpm test` is the unit gate (no database). CI `integration` job applies migrations from empty Postgres and re-runs tests so Postgres `skipIf` cases execute (`INTEGRATION` and `DATABASE_URL` are turbo test env so unit and integration caches stay distinct). Playwright: `E2E=1 pnpm test:e2e` or `.github/workflows/e2e.yml` (workflow_dispatch). SePay Sandbox live IPN is **not** proven. B1 remains open.

## 8. Build status

`pnpm typecheck`, `pnpm lint`, and `pnpm build` are the Phase 14 quality gate with the unit CI job.

## 9. Deployment checklist

- [ ] BLOCKERs B1–B6 closed or explicitly accepted in writing (accepting B1 means no paid production)
- [ ] SePay Sandbox checklist in `docs/SEPAY-SANDBOX.md` observed end-to-end
- [ ] Production secrets in secret store; signing key never in git
- [ ] Production DB migrated through `0010`; backup + restore drill done
- [ ] Public + private buckets; CDN and download DNS
- [ ] App URLs and `BETTER_AUTH_URL` match public hostnames
- [ ] Live Resend (or chosen provider) send test passed
- [ ] CI green on the revision (quality + integration)
- [ ] Smoke: home `/` → `/vi`, product, 404, sign-in, entitled download (if files exist)
- [ ] `MAINTENANCE_MODE` documented for cutover
- [ ] Single instance until Redis, or `REDIS_URL` configured

## 10. Remaining BEFORE PRODUCTION items

See **BEFORE PRODUCTION** in `docs/TODOS.md`. Highest leverage after BLOCKERs: SePay sandbox proof (B1), live email proof (B2), staging isolation, Redis if more than one instance, restore drill, staging E2E.
