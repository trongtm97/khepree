# Production status (Phase 21.0)

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
  db           Drizzle schema + migrations 0000–0017
  email        DevPreview + Resend HTTP adapter + VI/EN templates
  entitlement   feature grants (source of truth for access)
  licensing    keys, devices, Ed25519 leases (only when licensingMode requires)
  reseller     partners, wallet, referrals (domain only)
  sdk          client-neutral types
  security     RBAC, getRateLimiter() (memory dev / Redis prod), trusted-proxy IP
  storage      public/private object storage + upload content classes
  types        money (VND exponent 0) and shared contracts
  ui           design system
```

## 2. Implemented capabilities

- Transactional outbox: payment/order transition and `outbox_events` insert share one PostgreSQL transaction. Dedicated worker via `pnpm outbox:run` (poll loop with `OUTBOX_POLL_INTERVAL_MS`, graceful SIGTERM/SIGINT shutdown) or `POST /api/v1/internal/outbox/run` (Bearer `OUTBOX_WORKER_SECRET`, single tick). Stale `PROCESSING` locks are reclaimed after `OUTBOX_LOCK_TIMEOUT_MS`. Batch size: `OUTBOX_BATCH_SIZE`.
- Apps compose via `@khepree/platform`. `@khepree/reseller` is partner domain behavior.
- Audit writers can `bind(tx)` so audit rows roll back with the business transaction.
- Partner: VND wallets, `/vi` referral URLs, `accessTermDays`, explicit partner context, drizzle atomic issue.
- CMS: version allocation retries unique conflicts; compensating delete after failed metadata write; `media_assets.size_bytes` is BIGINT.
- Server-side `MarketPolicy` (default VN/VND). Production payment env is provider-extensible; mock is forbidden.
- Email: `ResendEmailAdapter` behind the existing interface. Production fails closed on `EMAIL_PROVIDER=dev`. Delivery is not proven.
- CI: unit job (no DB) + Postgres integration job (migrate from empty + critical-table tests). E2E PR workflow starts Postgres, migrates, builds apps, runs Playwright; staging dispatch requires `WEB_BASE_URL` / `ACCOUNT_BASE_URL` / `ADMIN_BASE_URL` / `PARTNER_BASE_URL` (fails fast if missing).
- PostgreSQL pool: `DATABASE_POOL_MAX` (default 10), `DATABASE_IDLE_TIMEOUT`, `DATABASE_CONNECT_TIMEOUT` — tuned for single VPS per process.

## 3. Missing production credentials

Must be created **outside** the repo (never committed):

- `DATABASE_URL` (production Postgres)
- `BETTER_AUTH_SECRET`, production `BETTER_AUTH_URL`
- `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY` (see `docs/LICENSE-SIGNING.md`)
- R2 (or S3-compatible) account, keys, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_PUBLIC_BASE_URL`
- `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, `EMAIL_PROVIDER_API_KEY` **and** a passing live send test
- SePay production credentials after B1 sandbox proof
- Optional `REDIS_URL` for multi-instance rate limits and **desktop refresh nonce replay protection** (**required in production** — `validateRuntimeEnv` fails closed without it)
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

Applied set in repo: `0000` … `0017_phase_k05_device_management`. Production is **not** migrated until an operator runs `pnpm db:migrate` against the production URL. Do not `pnpm db:seed` in production.

## 6. Security status

Addressed through Phase 21.0: same-tx outbox with stale-lock recovery and dedicated poll-loop worker, tx-bound audit, upload content classes, market price gate, request-scoped session memo, `getRateLimiter()` wired to Redis in production (memory forbidden when `REDIS_URL` set), production email fail-closed, provider-extensible payment env validation, migrate-from-zero integration tests, configurable DB pool.

Still open for launch: B1–B6 and P1–P10 in `docs/TODOS.md`. Email adapter is not proven against Resend. CSP allows unsafe-inline. SePay recurring and automated refunds are **not** implemented.

**Desktop (K08):** Auth, activation, refresh, checkout, and account hub flows are implemented and covered by 12 integration scenarios in `packages/platform/src/desktop-security-gate.test.ts`. Redis nonce store is wired for production refresh replay protection. No raw token logging found in audit. HTTP Playwright E2E for `api.khepree.com` desktop routes is not in CI smoke stack.

## 7. Test status

`pnpm test` is the unit gate (no database). CI `integration` job applies migrations from empty Postgres and re-runs tests so Postgres `skipIf` cases execute, including critical-table inventory after migrate-from-zero. Playwright: local PR workflow (`.github/workflows/e2e.yml`) starts full stack before tests; staging dispatch requires all four `*_BASE_URL` env vars. SePay Sandbox live IPN is **not** proven. B1 remains open.

**K08 desktop gate:** `@khepree/platform` `desktop-security-gate.test.ts` (12 scenarios) + `@khepree/security` `rate-limit-desktop.test.ts` + existing `@khepree/desktop-auth` refresh tests. Total platform package: 19 tests passing locally.

## 8. Build status

`pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` are the Phase 21.0 quality gate with the unit CI job. Apply migrations through `0013_phase16_url_redirects` before using Redirect Manager. Local `pnpm db:seed` keeps the catalog fixture (`development-sample`) **hidden** so it does not appear on the public website.

## 9. Deployment checklist

- [ ] BLOCKERs B1–B6 closed or explicitly accepted in writing (accepting B1 means no paid production)
- [ ] SePay Sandbox checklist in `docs/SEPAY-SANDBOX.md` observed end-to-end
- [ ] Production secrets in secret store; signing key never in git
- [ ] Production DB migrated through `0013`; backup + restore drill done
- [ ] Public + private buckets; CDN and download DNS
- [ ] App URLs and `BETTER_AUTH_URL` match public hostnames
- [ ] Live Resend (or chosen provider) send test passed
- [ ] CI green on the revision (quality + integration)
- [ ] Smoke: home `/` → `/vi`, product, 404, sign-in, entitled download (if files exist)
- [ ] `MAINTENANCE_MODE` documented for cutover
- [ ] Single instance until Redis, or `REDIS_URL` configured (**required** — production boot fails without it)

## 10. Remaining BEFORE PRODUCTION items

See **BEFORE PRODUCTION** in `docs/TODOS.md`. Highest leverage after BLOCKERs: SePay sandbox proof (B1), live email proof (B2), staging isolation, Redis if more than one instance, restore drill, staging E2E.
