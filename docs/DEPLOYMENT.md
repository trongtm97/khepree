# Deployment architecture

Khepree is a pnpm + Turborepo monorepo of Next.js apps and Node packages. Hosting is **portable**: any platform that can run Node 22, serve the built apps, and reach PostgreSQL plus S3-compatible object storage is fine. This document does not assume a specific cloud vendor.

## Runtime surfaces

| Public hostname | App | Default local port | Role |
|-----------------|-----|--------------------|------|
| khepree.com | `apps/web` | 3000 | Marketing, catalog, blog, docs, legal |
| account.khepree.com | `apps/account` | 3001 | Customer identity, checkout, licenses |
| admin.khepree.com | `apps/admin` | 3002 | Internal staff (no public sign-up) |
| partner.khepree.com | `apps/partner` | 3003 | Reseller / referral portal |
| api.khepree.com | `apps/api` | 3004 | Public/internal HTTP APIs |
| cdn.khepree.com | public object bucket | — | Public assets (`S3_PUBLIC_BASE_URL` or legacy `R2_PUBLIC_BASE_URL`) |
| download.khepree.com | private object bucket + signed URLs | — | Entitled downloads only |

`app.khepree.com` is reserved for future web products. Do not point it at marketing.

Each app should use its own `BETTER_AUTH` / `*_URL` base so cookies do not collide across hosts.

## Process model

1. Apply database migrations (`pnpm db:migrate`) against the environment database **before** starting apps that require schema.
2. Set production secrets in the host’s secret store (not in git, not in `NEXT_PUBLIC_*`).
3. Build: `pnpm install --frozen-lockfile` then `pnpm build`.
4. Run each app’s `next start` (or the container equivalent) with that app’s URL and port.
5. `validateRuntimeEnv()` runs on Node boot (not during `next build`). Production start fails if database, auth, both storage buckets, license signing keys, email env vars, or SePay credentials (`PAYMENT_PROVIDER=sepay`) are missing.

CI (`.github/workflows/ci.yml`) runs on pull requests. **Production deploy** (`.github/workflows/production.yml`) runs on push to `main`: quality → integration → GHCR images → VPS SSH deploy. See `docs/VPS-CICD.md`.

End-to-end Playwright is separate: `E2E=1 pnpm test:e2e` with apps listening on 3000–3003. Wire that to a staging environment, not to the default PR job, unless the runner provides the full stack.

## Required DNS

Create records for the hostnames above. Typical layout (values depend on your edge/compute):

| Name | Type | Points at |
|------|------|-----------|
| khepree.com | A/AAAA or CNAME | web app ingress |
| www.khepree.com | CNAME | khepree.com (optional; redirect to apex) |
| account.khepree.com | CNAME | account app ingress |
| admin.khepree.com | CNAME | admin app ingress |
| partner.khepree.com | CNAME | partner app ingress |
| api.khepree.com | CNAME | api app ingress |
| cdn.khepree.com | CNAME | public bucket / CDN |
| download.khepree.com | CNAME | download ingress or private-bucket custom domain |

TLS certificates must cover every hostname you serve. Admin and account should not be served from the marketing origin.

## Environment variables (apps)

Set per environment (see `docs/ENVIRONMENTS.md`):

- `APP_URL`, `ACCOUNT_URL`, `ADMIN_URL`, `PARTNER_URL`, `API_URL`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ACCOUNT_URL` (public URLs only)
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (account host in production)
- R2 / S3 credentials and bucket names (`docs/R2.md`)
- `LICENSE_SIGNING_PRIVATE_KEY`, `LICENSE_SIGNING_PUBLIC_KEY` (`docs/LICENSE-SIGNING.md`)
- Email and payment provider secrets when those integrations are live (`PAYMENT_PROVIDER`, `SEPAY_*`, never `NEXT_PUBLIC_`)
- `REDIS_URL` — **required in production** for rate limits and desktop refresh nonce replay protection (see `docs/DESKTOP-ECOSYSTEM.md` K08)

Desktop clients call `api.khepree.com` for token exchange, activation, refresh, heartbeat, checkout, and `/me`. Account hosts authorize UI (`/desktop/authorize`) and checkout handoff (`/desktop/checkout/{orderPublicId}`). Register each app in `desktop_clients` with allowlisted redirect URIs before go-live.
- `TRUSTED_PROXY=none` (default) or `cloudflare` when the app sits behind Cloudflare. Client IP for rate limits comes from `CF-Connecting-IP` only in that mode. Do not trust `X-Forwarded-For`.
- `REDIS_URL` — required in production for rate limits and desktop refresh nonce store (see `docs/ENVIRONMENTS.md`).

Maintenance: `MAINTENANCE_MODE=1` returns 503 from the web/account/admin/partner proxy.

## VPS compose layouts

| File | Use when |
|------|----------|
| `compose.production.yml` | Dedicated Khepree VPS — includes Caddy on 80/443 |
| `compose.shared-vps.yml` | Same VPS as CHAPMEE — reuses `chapmee-caddy` via `chapmee_chapmee_net` |

Shared VPS step-by-step: **`docs/SHARED-VPS-DEPLOYMENT.md`**.

## Health and rollback

- Confirm `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` on the revision you will run.
- After migrate, keep the previous app image until a smoke check of sign-in, a public product page, and (if payments are live) webhook delivery succeeds.
- Database rollback is not `db:push` reverse — see `docs/DATABASE.md`.
