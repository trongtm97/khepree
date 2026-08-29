# Production status (Phase 12)

This is an inventory, not a launch certificate. **Khepree is not production-ready** while any BLOCKER in `docs/TODOS.md` remains open.

## 1. Current architecture tree

```
apps/
  web          khepree.com           marketing, catalog, blog, docs, legal
  account      account.khepree.com   identity, checkout, licenses, billing
  admin        admin.khepree.com     staff RBAC, domain commands, audit
  partner      partner.khepree.com   referral / reseller
  api          api.khepree.com       HTTP APIs
  e2e          Playwright            optional, E2E=1
packages/
  auth         Better Auth (identity only)
  catalog      products, plans, features, CMS, media
  commerce     orders, payments, subscriptions, mock PSP
  config       env, domains, logger, validation
  db           Drizzle schema + migrations 0000–0007
  email        adapter (dev preview only)
  entitlement  feature grants (source of truth for access)
  licensing    keys, devices, Ed25519 leases
  reseller     partners, wallet, referrals
  sdk          client-neutral types
  security     RBAC, rate limit, headers
  storage      public/private object storage
  types        money and shared contracts
  ui           design system
```

## 2. Implemented capabilities

- Public IA (en/vi): `/`, `/products`, `/products/[slug]`, `/solutions`, `/solutions/{creators,professionals,entrepreneurs,business}`, `/pricing`, `/blog`, `/blog/[slug]`, `/docs`, `/docs/[...]`, `/about`, `/contact`, `/security`, `/privacy`, `/terms`. No `/cookies` page (redirects to privacy). Account CTAs use `accountPublicUrl()`.
- Catalog + CMS-backed blog/docs with empty states; unpublished entries 404.
- SEO: per-page canonical, hreflang + `x-default`, robots, sitemap (static + products + published content), OG, Organization/Breadcrumb/SoftwareApplication/Article JSON-LD. Locale layout does not force canonical `/`.
- Commerce (mock), entitlement, hashed license keys, device activation, partner wallet/referrals, admin RBAC, audit log.
- Rate limits (in-memory), security headers, structured logs, `validateRuntimeEnv()` on boot.
- CI: install, lint, typecheck, test, build — no deploy.

## 3. Missing production credentials

Must be created **outside** the repo (never committed):

- `DATABASE_URL` (production Postgres)
- `BETTER_AUTH_SECRET`, production `BETTER_AUTH_URL`
- `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY` (see `docs/LICENSE-SIGNING.md`)
- R2 (or S3-compatible) account, keys, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_PUBLIC_BASE_URL`
- `EMAIL_FROM`, `EMAIL_PROVIDER_API_KEY` **and** a real email adapter (env alone is not enough today)
- Live PSP credentials and webhook secret (when B1 is done)
- OAuth client secrets if Google sign-in is enabled

## 4. Required external configuration

- DNS + TLS for hostnames in `docs/DEPLOYMENT.md`
- Separate preview vs production resources (`docs/ENVIRONMENTS.md`)
- Bucket CORS/lifecycle if browser uploads or retention rules apply (`docs/R2.md`)
- OAuth redirect URIs, email domain authentication (SPF/DKIM) when email is real
- Backup schedule for Postgres and objects

## 5. Database migrations status

Applied set in repo: `0000` … `0007_phase10_admin`. No Phase 12 migration. Production is **not** migrated until an operator runs `pnpm db:migrate` against the production URL. Do not `pnpm db:seed` in production.

## 6. Security status

Addressed through Phase 11: session-bound media upload, entitled private downloads, webhook amount/currency check, mock checkout blocked in production, headers, rate limits, log redaction, env validation.

Still open for launch: B1–B6 and P1–P3 in `docs/TODOS.md`. In-memory rate limits are per process. Email adapter does not send. CSP allows unsafe-inline.

## 7. Test status

`pnpm test` passed locally (2026-08-30): catalog 34, commerce 14, reseller 15, licensing 11, entitlement 8, plus config/security/db/storage/auth/account/api/email. Playwright is **not** in this run (`E2E=1 pnpm test:e2e`).

## 8. Build status

`pnpm typecheck`, `pnpm lint` (warnings only on anonymous eslint config exports, no errors), and `pnpm build` passed locally on 2026-08-30. CI workflow: `.github/workflows/ci.yml`.

## 9. Deployment checklist

- [ ] BLOCKERs B1–B6 closed or explicitly accepted in writing (accepting B1 means no paid production)
- [ ] Production secrets in secret store; signing key never in git
- [ ] Production DB migrated; backup + restore drill done
- [ ] Public + private buckets; CDN and download DNS
- [ ] App URLs and `BETTER_AUTH_URL` match public hostnames
- [ ] CI green on the revision
- [ ] Smoke: home, product, 404, sign-in, entitled download (if files exist)
- [ ] `MAINTENANCE_MODE` documented for cutover

## 10. Remaining BEFORE PRODUCTION items

See **BEFORE PRODUCTION** in `docs/TODOS.md` (P1–P10). Highest leverage after BLOCKERs: staging isolation, Redis rate limits if more than one instance, real email adapter, live PSP, restore drill, staging E2E.
