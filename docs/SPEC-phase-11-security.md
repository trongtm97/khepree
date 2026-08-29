# Spec: Phase 11 — Production security, testing, and observability

## Objective

Harden the existing Khepree surface for production: close addressable Critical/High findings, add a reusable rate-limit and security-header layer, structured logging with redaction, error UX without stack traces, and Playwright coverage for critical flows. No new product phase.

## Assumptions

1. In-memory rate limiting is enough for single-instance / first production. Multi-instance needs a shared store (Redis). Fail **closed** (429) when the limiter throws.
2. CSP uses `'unsafe-inline'` for scripts/styles so Next.js and JSON-LD keep working. Nonce-based CSP is the upgrade path, not this phase.
3. Playwright lives in `apps/e2e`. Default `pnpm test` does not launch browsers. Run `E2E=1 pnpm test:e2e` with apps up.
4. Mock checkout is development-only. Production must not complete payments via the mock adapter UI.
5. `NEXT_PUBLIC_*` stay public URLs/social links only. Signing keys, webhook secrets, and R2 credentials stay server-side.

## Audit findings

### Critical

| ID | Finding | Disposition |
|----|---------|-------------|
| C1 | `POST /api/v1/media/upload-url` and `complete` had no session. Client could set `ownerType` / `ownerId`. | **Fixed.** Session required; owner derived from session; object key bound to owner. |

### High

| ID | Finding | Disposition |
|----|---------|-------------|
| H1 | No rate limiting on auth, license, webhooks, or sensitive mutations. | **Fixed.** `@khepree/security` limiter; wired on auth, license, webhooks, media, admin/partner POSTs. Fail closed. |
| H2 | No CSP / Referrer-Policy / nosniff / Permissions-Policy / HSTS / frame-ancestors. | **Fixed.** Shared header helper applied from each app `proxy.ts`. HSTS production-only. |
| H3 | Mock checkout always fell back to `"dev-mock-webhook-secret"`. | **Fixed.** Production refuses the mock checkout action and page. |
| H4 | `payment.succeeded` webhooks did not compare amount/currency to the stored payment. | **Fixed.** Mismatch → `WEBHOOK_INVALID`. |
| H5 | Private download API always 401 (stub) and policy was ownership-only. Product files need entitlement before a URL is issued. | **Fixed.** Session + entitlement for `product:` media context. |
| H6 | `validateRuntimeEnv()` not called at process boot; license/email/webhook secrets not in the production check. | **Fixed.** `instrumentation.ts` in each app; validator expanded. Skips Next.js build phase. |

### Medium

| ID | Finding | Disposition |
|----|---------|-------------|
| M1 | Proxy only checks cookie presence; layouts still `requireSession()`. | Defense in depth — documented, not a hole. |
| M2 | No `error.tsx` / `not-found.tsx` / `global-error.tsx`. Partner/admin `fail()` leaked `Error.message`. | **Fixed.** Error pages; production-generic action errors. |
| M3 | JSON-LD `dangerouslySetInnerHTML` without `<` escape. | **Fixed.** `\u003c` escape. |
| M4 | Ownerless private media allowed in test/dev; presigned PUT had no Content-Length. | Ownerless stays test/dev-only. Content-Length bound on presign when size is known. |
| M5 | Dev email adapter can log reset URLs. Auth audit stores email. | Preview logs omit bodies in production; audit keeps email (identity event). |
| M6 | Admin `ilike` search does not escape `%` / `_`. | Residual — Drizzle is parameterized; wildcard abuse is support-scope only. |
| M7 | CSP `'unsafe-inline'` for Next.js. | Residual — nonce CSP later. |

### Low

| ID | Finding | Disposition |
|----|---------|-------------|
| L1 | `NEXT_PUBLIC_*` are URLs and social links only. | No secret leakage. |
| L2 | `@khepree/validation` unused. | Left in place (email/slug helpers); not abandoned experimental code. |
| L3 | No explicit CORS on `apps/api` (same-origin / cookie session). | Documented. Do not open `*` . |
| L4 | API `trustedOrigins` does not include `API_URL` (Better Auth lives on account/admin/partner). | Intentional. |
| L5 | In-memory limiter is per-process. | `ponytail:` Redis upgrade. |

### In scope, already solid (no code change)

- SQL via Drizzle (no string-concat queries found).
- Open redirects: `safeReturnPath` + tests.
- No user-controlled server-side fetch (SSRF).
- License keys hashed; Ed25519 keys env-only; ephemeral only in dev.
- Webhook HMAC + `(provider, eventId)` idempotency.
- Feature-based entitlement (no `if (plan === "PRO")`).
- Session cookies: Better Auth `useSecureCookies` in production.
- Money: BIGINT minor units.

## Rate limits

| Surface | Window | Max | Key | Fail |
|---------|--------|-----|-----|------|
| Sign in | 15 min | 10 | IP + route | 429 closed |
| Sign up | 15 min | 5 | IP + route | 429 closed |
| Forgot / reset password | 15 min | 5 | IP + route | 429 closed |
| Verification | 15 min | 10 | IP + route | 429 closed |
| Other `/api/auth` POST | 1 min | 30 | IP | 429 closed |
| License activate / refresh | 1 min | 30 | IP | 429 closed |
| Webhooks | 1 min | 60 | IP + provider | 429 closed |
| Media upload/complete | 1 min | 20 | IP + user | 429 closed |
| Admin / partner POST | 1 min | 40 | IP | 429 closed |

## Success criteria

- Findings table above is the source of truth; Critical/High in-repo items are fixed.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
- Playwright specs exist for signup/login pages, account gate, product browse, mock checkout (dev), license/account pages, partner login, admin no-signup / unauthenticated redirect.
