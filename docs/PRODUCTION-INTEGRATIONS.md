# Production integrations checklist

Operator checklist for wiring external services before go-live. **Do not commit credentials, API keys, or private keys to git.** Store values in `/etc/khepree/.env.production` (see `docs/VPS-SECURITY.md`).

Template: `.env.production.example`. Environment matrix: `docs/ENVIRONMENTS.md`.

Mark each item when complete. Record proof in your **private ops journal** (date, operator, outcome) — not in this repository.

---

## Pre-flight

| # | Check | Done |
|---|--------|------|
| 0.1 | VPS hardened per `docs/VPS-SECURITY.md` | ☐ |
| 0.2 | Stack running: `compose.production.yml` + `/etc/khepree/.env.production` | ☐ |
| 0.3 | DNS proxied through Cloudflare (if `TRUSTED_PROXY=cloudflare`) | ☐ |
| 0.4 | Run `scripts/integrations/verify-production-config.sh` (no secrets printed) | ☐ |

---

## 1. Domains and public URLs

Production hostnames must match what browsers and webhooks hit. `validateRuntimeEnv()` fails boot if any are missing or contain `CHANGE_ME`.

### Server URLs (`.env.production`)

| Variable | Production value | Done |
|----------|------------------|------|
| `WEB_URL` | `https://khepree.com` | ☐ |
| `APP_URL` | `https://khepree.com` | ☐ |
| `ACCOUNT_URL` | `https://account.khepree.com` | ☐ |
| `ADMIN_URL` | `https://admin.khepree.com` | ☐ |
| `PARTNER_URL` | `https://partner.khepree.com` | ☐ |
| `API_URL` | `https://api.khepree.com` | ☐ |

### Browser-visible URLs (`NEXT_PUBLIC_*`)

Must match the HTTPS origins above. Rebuild app images after changing these (they are baked at build time for client bundles).

| Variable | Production value | Done |
|----------|------------------|------|
| `NEXT_PUBLIC_WEB_URL` | `https://khepree.com` | ☐ |
| `NEXT_PUBLIC_ACCOUNT_URL` | `https://account.khepree.com` | ☐ |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.khepree.com` | ☐ |
| `NEXT_PUBLIC_PARTNER_URL` | `https://partner.khepree.com` | ☐ |

### DNS + TLS

| # | Check | Done |
|---|--------|------|
| 1.1 | A/AAAA or CNAME for all six app hostnames → VPS (proxied) | ☐ |
| 1.2 | `www.khepree.com` → redirect to apex (Caddy) | ☐ |
| 1.3 | `cdn.khepree.com` → public R2 bucket (see §5) | ☐ |
| 1.4 | TLS valid on every public hostname (Caddy ACME + Cloudflare Full Strict) | ☐ |
| 1.5 | `curl -sS https://khepree.com/healthz` returns 200 | ☐ |
| 1.6 | `curl -sS https://api.khepree.com/readyz` returns 200 (DB + Redis) | ☐ |

---

## 2. Better Auth

Identity runs on **account** (`apps/account`). Admin and partner run **separate** Better Auth instances on their own hosts — sessions are **not** shared via a parent-domain cookie.

### Configuration

| Variable | Value | Done |
|----------|-------|------|
| `BETTER_AUTH_SECRET` | ≥32 chars entropy — generate offline (`openssl rand -base64 32`) | ☐ |
| `BETTER_AUTH_URL` | `https://account.khepree.com` | ☐ |

### Cookie and origin audit

| # | Behavior | Verified |
|---|----------|----------|
| 2.1 | Account session cookie is **host-only** for `account.khepree.com` (`useSecureCookies` in production) | ☐ |
| 2.2 | Admin signs in at `admin.khepree.com` — separate session from account | ☐ |
| 2.3 | Partner signs in at `partner.khepree.com` — separate session | ☐ |
| 2.4 | **No** `Domain=.khepree.com` cookie across all subdomains (not used in codebase) | ☐ |
| 2.5 | `getTrustedOrigins()` on account includes `BETTER_AUTH_URL`, `ACCOUNT_URL`, `APP_URL`, `ADMIN_URL`, `PARTNER_URL` for CSRF/trusted-origin checks only — not cookie sharing | ☐ |
| 2.6 | Email verification required in production (`requireEmailVerification: true`) | ☐ |
| 2.7 | Staff MFA enforced on admin when `adminMfaRequired` applies | ☐ |

### Proof to record (private ops journal)

- Sign up / sign in on account — session persists on refresh
- Sign in on admin — works independently; sign out on account does not silently grant admin access

---

## 3. Google OAuth (optional)

Google login appears **only** when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set and do not contain `CHANGE_ME` (`isGoogleAuthConfigured()`). UI hides the button otherwise.

### Google Cloud Console (production OAuth client)

| Setting | Value |
|---------|-------|
| Authorized JavaScript origins | `https://account.khepree.com` |
| Authorized redirect URIs | `https://account.khepree.com/api/auth/callback/google` |

| # | Check | Done |
|---|--------|------|
| 3.1 | **Separate** OAuth client for development (`http://localhost:3001/...`) — do not mix prod redirect URIs into dev client if avoidable | ☐ |
| 3.2 | Production client has **only** production URIs (no localhost on prod client) | ☐ |
| 3.3 | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `/etc/khepree/.env.production` | ☐ |
| 3.4 | Google button visible on account sign-in only when configured | ☐ |
| 3.5 | End-to-end Google sign-in completes on production account host | ☐ |

### If Google is not used

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` unset. Email/password + MFA remain available.

---

## 4. Resend (transactional email)

Production **requires** `EMAIL_PROVIDER=resend`. Boot fails on `EMAIL_PROVIDER=dev`.

| Variable | Notes | Done |
|----------|-------|------|
| `EMAIL_PROVIDER` | `resend` | ☐ |
| `EMAIL_FROM` | Verified sender on `khepree.com` (e.g. `Khepree <no-reply@khepree.com>`) | ☐ |
| `EMAIL_PROVIDER_API_KEY` | Resend API key — secret store only | ☐ |

### DNS (khepree.com zone)

| Record | Purpose | Done |
|--------|---------|------|
| SPF | Authorize Resend to send | ☐ |
| DKIM | Resend-provided CNAME/TXT | ☐ |
| DMARC | Policy record (start with `p=none` or `p=quarantine` per policy) | ☐ |

Resend dashboard must show domain **Verified**.

### Live send proof (B2 — record externally)

Run on staging or production with real keys. **Do not paste message IDs or keys into git.**

| Flow | Sent | Received | Date | Operator |
|------|------|----------|------|----------|
| Email verification (sign-up) | ☐ | ☐ | | |
| Password reset | ☐ | ☐ | | |
| Payment / order receipt (if template live) | ☐ | ☐ | | |

---

## 5. Cloudflare R2

Object bytes live off-VPS. Postgres holds metadata only (`media_assets`, release keys).

### Buckets (production — separate from dev/staging)

| Bucket env | Purpose | Done |
|------------|---------|------|
| `R2_BUCKET_PUBLIC` | Marketing / public CDN assets | ☐ |
| `R2_BUCKET_PRIVATE` | Installers, CMS bodies, entitled downloads | ☐ |

| Variable | Production value | Done |
|----------|------------------|------|
| `R2_ACCOUNT_ID` | Cloudflare account ID | ☐ |
| `R2_ACCESS_KEY_ID` | R2 API token (scoped) | ☐ |
| `R2_SECRET_ACCESS_KEY` | Secret — never in git/CI logs | ☐ |
| `R2_PUBLIC_BASE_URL` | `https://cdn.khepree.com` | ☐ |

### Security

| # | Check | Done |
|---|--------|------|
| 5.1 | Private bucket has **no** public listing / anonymous read | ☐ |
| 5.2 | `download.khepree.com` serves signed URLs only (not directory listing) | ☐ |
| 5.3 | Versioning enabled on private bucket (recommended) — `docs/R2.md` | ☐ |
| 5.4 | CORS on private bucket: origins `https://admin.khepree.com`, `https://account.khepree.com` only (if browser upload) | ☐ |
| 5.5 | CORS on public bucket: same tight origins if browser PUT is used | ☑ |
| 5.6 | Upload test from admin CMS / account — succeeds | ☐ |
| 5.7 | Public image loads from `cdn.khepree.com` on marketing page | ☐ |

---

## 6. License signing keys (Ed25519)

Generate **offline** on a trusted machine. See `docs/LICENSE-SIGNING.md`.

| # | Check | Done |
|---|--------|------|
| 6.1 | Keypair generated — **private key never in git, Docker image, or CI logs** | ☐ |
| 6.2 | `LICENSE_SIGNING_PRIVATE_KEY` in secret store only | ☐ |
| 6.3 | `LICENSE_SIGNING_PUBLIC_KEY` in production env | ☐ |
| 6.4 | Sealed offline backup of private key (separate from repo) | ☐ |
| 6.5 | Issue test lease / activation on staging — verifies signing works | ☐ |

```bash
# Generate locally (do not commit output):
node -e "const {generateKeyPairSync}=require('crypto'); const k=generateKeyPairSync('ed25519'); console.log('PRIVATE (secret):', k.privateKey.export({type:'pkcs8',format:'der'}).toString('base64')); console.log('PUBLIC:', k.publicKey.export({type:'spki',format:'der'}).toString('base64'))"
```

---

## 7. SePay (payments)

**Keep sandbox until the official end-to-end gate passes (B1).** Deployment must **not** flip `SEPAY_ENV=production` automatically.

### Staging / pre-go-live (default)

| Variable | Value |
|----------|-------|
| `PAYMENT_PROVIDER` | `sepay` |
| `SEPAY_ENV` | `sandbox` |
| `SEPAY_MERCHANT_ID` | Sandbox merchant ID |
| `SEPAY_SECRET_KEY` | Sandbox secret |
| `SEPAY_IPN_SECRET` | Sandbox IPN secret (or same as secret key) |

| # | Sandbox gate (B1) | Done |
|---|-------------------|------|
| 7.1 | Checkout completes in sandbox | ☐ |
| 7.2 | IPN received at `https://api.khepree.com/...` with valid `X-Secret-Key` | ☐ |
| 7.3 | Order + payment rows transition correctly | ☐ |
| 7.4 | Documented in private ops journal per `docs/SEPAY-SANDBOX.md` | ☐ |

### Production payment activation (manual go-live — separate gate)

Only after B1 + counsel + ops sign-off:

| # | Action | Done |
|---|--------|------|
| 7.5 | Replace sandbox credentials with **production** SePay credentials in secret store | ☐ |
| 7.6 | Set `SEPAY_ENV=production` manually — never via deploy script | ☐ |
| 7.7 | Register production IPN URL with SePay | ☐ |
| 7.8 | Small real-money test transaction + refund/manual flow documented | ☐ |

`.env.production.example` ships with `SEPAY_ENV=sandbox` intentionally.

---

## 8. Redis (rate limiting)

`REDIS_URL` is **required** in production. `getRateLimiter()` uses `RedisRateLimiter`; boot fails without Redis.

In `compose.production.yml`, URL is composed as:

```
redis://:${REDIS_PASSWORD}@redis:6379
```

| # | Check | Done |
|---|--------|------|
| 8.1 | `REDIS_PASSWORD` set in `/etc/khepree/.env.production` | ☐ |
| 8.2 | `api.khepree.com/readyz` reports Redis healthy | ☐ |
| 8.3 | Rate limits hit Redis (not per-process memory) — see validation below | ☐ |
| 8.4 | Redis data treated as disposable — no commerce state only in Redis (`docs/DATA-SAFETY.md`) | ☐ |

### Validate rate limits use Redis

1. Confirm `NODE_ENV=production` and `REDIS_URL` set in running API container.
2. From two different clients (or IPs), exceed a known rate-limited endpoint until `429` is returned.
3. Optional: `docker compose exec redis redis-cli -a "$REDIS_PASSWORD" KEYS '*'` — should show rate-limit keys after step 2 (exact prefix is implementation detail).
4. Restart Redis container — rate counters reset (expected); commerce data unaffected.

---

## 9. Outbox worker secret

Two execution modes:

| Mode | Config |
|------|--------|
| Dedicated worker container | `pnpm outbox:run` poll loop — **no HTTP secret required** |
| HTTP cron trigger | `POST https://api.khepree.com/api/v1/internal/outbox/run` with `Authorization: Bearer <OUTBOX_WORKER_SECRET>` |

If the HTTP endpoint remains enabled (cron or external scheduler):

| # | Check | Done |
|---|--------|------|
| 9.1 | `OUTBOX_WORKER_SECRET` generated (`openssl rand -base64 32`) | ☐ |
| 9.2 | Secret stored only in `/etc/khepree/.env.production` | ☐ |
| 9.3 | Endpoint returns `401` without Bearer token | ☐ |
| 9.4 | Valid Bearer runs one outbox tick successfully | ☐ |
| 9.5 | Prefer dedicated `worker` service in compose over public cron if possible | ☐ |

---

## 10. Proxy and misc

| Variable | Production | Done |
|----------|------------|------|
| `TRUSTED_PROXY` | `cloudflare` only when traffic is Cloudflare-proxied (orange cloud) | ☐ |
| `NODE_ENV` | `production` | ☐ |

---

## Go-live sign-off

All **BLOCKER** items in `docs/TODOS.md` (B1–B6) must be closed before accepting real customers. This checklist does not override that ledger.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering | | | |
| Operations | | | |

---

## Related docs

| Doc | Topic |
|-----|-------|
| `docs/DEPLOYMENT.md` | Hostnames, process model |
| `docs/ENVIRONMENTS.md` | Dev / staging / prod isolation |
| `docs/VPS-SECURITY.md` | Secret directory, Cloudflare |
| `docs/DATA-SAFETY.md` | Backups (not a substitute for R2) |
| `docs/R2.md` | Buckets, CORS, versioning |
| `docs/LICENSE-SIGNING.md` | Ed25519 keys |
| `docs/SEPAY-SANDBOX.md` | B1 sandbox proof procedure |
| `scripts/integrations/verify-production-config.sh` | Non-secret config validation |
