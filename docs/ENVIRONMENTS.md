# Environment matrix

Three environments. Treat them as separate systems. **Never reuse a production signing key, webhook secret, or database in development or preview.**

| | Development | Preview / staging | Production |
|--|-------------|-------------------|------------|
| Purpose | Local work | Shared pre-prod | Real customers |
| `NODE_ENV` | `development` | `production` (or host equivalent) | `production` |
| Database | Local Postgres (`khepree_local`) | Dedicated database | Dedicated database |
| Object storage | Mock if R2 unset; or **dev** buckets/prefixes | Staging buckets/prefixes | Production buckets |
| Auth URLs | localhost ports | preview hostnames | `account.khepree.com` etc. |
| `BETTER_AUTH_SECRET` | local only | staging secret | production secret |
| License Ed25519 | ephemeral or **dev** keypair | staging keypair | production keypair in secret store |
| Webhook secrets | `MOCK_PAYMENT_WEBHOOK_SECRET` local | staging | production |
| Email | Dev preview logger | provider test/sandbox | provider production |
| Payments | Mock adapter only | sandbox PSP | live PSP (not implemented yet) |
| Seed | Allowed (`pnpm db:seed`) | Optional, never production catalog samples | **Forbidden** |

## Isolation rules

1. **Databases** — one cluster/database per environment. Do not point preview at production.
2. **Buckets** — separate public and private buckets (or hard prefixes) per environment. Private never falls back to public.
3. **Auth URLs** — `BETTER_AUTH_URL` and `ACCOUNT_URL` / `ADMIN_URL` / `PARTNER_URL` must match the host the browser uses, or cookies and redirects break.
4. **Webhook secrets** — unique per environment. Production `validateRuntimeEnv()` requires `MOCK_PAYMENT_WEBHOOK_SECRET` until a live PSP replaces mock; do not copy the production value into `.env` for local work.
5. **Signing keys** — production private key stays in secret infrastructure. Development may use ephemeral keys (`packages/licensing`) which invalidate leases on restart.

## What `validateRuntimeEnv()` requires in production

Checked at Node boot (skipped during `next build`):

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `APP_URL`, `ACCOUNT_URL`, `ADMIN_URL`, `PARTNER_URL`, `API_URL`
- Public **and** private object storage
- `LICENSE_SIGNING_PRIVATE_KEY` and `LICENSE_SIGNING_PUBLIC_KEY`
- `EMAIL_FROM` and `EMAIL_PROVIDER_API_KEY`
- `MOCK_PAYMENT_WEBHOOK_SECRET`

Template: `.env.example`. Real values live only in the environment’s secret store.

## Preview vs production hosts

Preview should use distinct hostnames (for example `web-staging.example` / `account-staging.example`), not production DNS. CORS, cookie `Domain`, and OAuth redirect URIs must list those hosts explicitly.
