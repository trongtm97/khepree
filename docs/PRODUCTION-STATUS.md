# Production status (Phase 13)

This is an inventory, not a launch certificate. **Khepree is not production-ready** while any BLOCKER in `docs/TODOS.md` remains open. Compiling Phase 13 does not mean go-live.

## 1. Current architecture tree

```
apps/
  web          khepree.com           marketing, catalog, blog, docs, legal (vi default)
  account      account.khepree.com   identity, checkout, licenses, billing
  admin        admin.khepree.com     staff RBAC, domain commands, audit
  partner      partner.khepree.com   referral / reseller
  api          api.khepree.com       HTTP APIs (SePay IPN: /api/v1/webhooks/payments/sepay)
  e2e          Playwright            optional, E2E=1
packages/
  auth         Better Auth (identity only)
  catalog      products, plans, features, CMS, media
  commerce     orders, payments, refunds ledger, mock + SePay adapters
  config       env, domains, logger, validation
  db           Drizzle schema + migrations 0000–0008
  email        adapter (dev preview only) + VI/EN templates
  entitlement  feature grants (source of truth for access)
  licensing    keys, devices, Ed25519 leases (only when licensingMode requires)
  reseller     partners, wallet, referrals
  sdk          client-neutral types
  security     RBAC, rate limit, trusted-proxy IP
  storage      public/private object storage
  types        money (VND exponent 0) and shared contracts
  ui           design system
```

## 2. Implemented capabilities

- Vietnam-first public IA: `/` 308 → `/vi`; English at `/en`. hreflang `vi-VN` / `en`, `x-default` Vietnamese.
- Catalog + CMS with `DEFAULT_LOCALE=vi` fallback. English content is kept.
- Default currency VND (USD prices still supported). Money uses integer minor units + `currencyExponent`.
- Commerce: provider-neutral `CheckoutAction` (`redirect` | `form_post`). SePay one-time VND checkout. Mock remains development-only.
- IPN: `X-Secret-Key`, sanitized payload, amount/currency match, duplicate events do not re-run hooks.
- Entitlement term from access policy (not provider subscription). License issued only for `DEVICE_LEASE` / `LICENSE_KEY_DEVICE`.
- Rate limits (in-memory, single-instance launch restriction). `TRUSTED_PROXY=none|cloudflare`.
- CI: install, lint, typecheck, test, build — no deploy.

## 3. Missing production credentials

Must be created **outside** the repo (never committed):

- `DATABASE_URL` (production Postgres)
- `BETTER_AUTH_SECRET`, production `BETTER_AUTH_URL`
- `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY` (see `docs/LICENSE-SIGNING.md`)
- R2 (or S3-compatible) account, keys, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_PUBLIC_BASE_URL`
- `EMAIL_FROM`, `EMAIL_PROVIDER_API_KEY` **and** a real email adapter (env alone is not enough today)
- SePay production credentials after B1 sandbox proof: `SEPAY_ENV`, `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY` (optional `SEPAY_IPN_SECRET`)
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

Applied set in repo: `0000` … `0008_phase13_vietnam_sepay`. Production is **not** migrated until an operator runs `pnpm db:migrate` against the production URL. Do not `pnpm db:seed` in production.

## 6. Security status

Addressed through Phase 13: SePay IPN secret comparison, sanitized webhook persistence, amount/currency mismatch rejection, success URL is UX-only, mock checkout blocked in production, trusted-proxy IP, env validation requires SePay in production.

Still open for launch: B1–B6 and P1–P3 in `docs/TODOS.md`. In-memory rate limits are per process (single instance until Redis). Email adapter does not send. CSP allows unsafe-inline. SePay recurring and automated refunds are **not** implemented.

## 7. Test status

`pnpm test` passed locally (2026-08-30, Phase 13): catalog 41, commerce 29, reseller 15, licensing 11, entitlement 11, config 11, security 20, plus db/storage/auth/account/api/email. Playwright is **not** in this run (`E2E=1 pnpm test:e2e`). SePay Sandbox live IPN is **not** proven (`docs/SEPAY-SANDBOX.md`).

## 8. Build status

`pnpm typecheck`, `pnpm lint` (warnings only on anonymous eslint config exports, no errors), and `pnpm build` passed locally on 2026-08-30. CI workflow: `.github/workflows/ci.yml`.

## 9. Deployment checklist

- [ ] BLOCKERs B1–B6 closed or explicitly accepted in writing (accepting B1 means no paid production)
- [ ] SePay Sandbox checklist in `docs/SEPAY-SANDBOX.md` observed end-to-end
- [ ] Production secrets in secret store; signing key never in git
- [ ] Production DB migrated through `0008`; backup + restore drill done
- [ ] Public + private buckets; CDN and download DNS
- [ ] App URLs and `BETTER_AUTH_URL` match public hostnames
- [ ] CI green on the revision
- [ ] Smoke: home `/` → `/vi`, product, 404, sign-in, entitled download (if files exist)
- [ ] `MAINTENANCE_MODE` documented for cutover
- [ ] Single-instance until Redis (P1)

## 10. Remaining BEFORE PRODUCTION items

See **BEFORE PRODUCTION** in `docs/TODOS.md` (P1–P10). Highest leverage after BLOCKERs: SePay sandbox proof (B1), staging isolation, Redis rate limits if more than one instance, real email adapter, restore drill, staging E2E.
