# Remaining work ledger (Phase 14)

Items are categorized as they stood after Phase 14. **BLOCKER** means do not send real customers to production until it is resolved. This list is not an implementation backlog for a later product phase.

Phase 14 added a PostgreSQL transactional outbox, `@khepree/platform`, partner/CMS/auth/email/CI hardening. **B1 is still open.** Email delivery is implemented behind an adapter but **not** proven with a live send. Do not claim production-ready.

## BLOCKER

| ID | Item | Notes |
|----|------|--------|
| B1 | Live payment provider | SePay adapter is implemented (`PAYMENT_PROVIDER=sepay`). Development may still use `mock`. **Not resolved:** verified SePay Sandbox checkout + IPN per `docs/SEPAY-SANDBOX.md`. |
| B2 | Transactional email delivery | `ResendEmailAdapter` exists. Production rejects `EMAIL_PROVIDER=dev`. **Not resolved:** a real message delivered and observed. |
| B3 | Production secrets | Production Ed25519 private key, `BETTER_AUTH_SECRET`, R2 keys, SePay credentials, Resend key, and a real `DATABASE_URL` must exist in secret infrastructure — not in git. |
| B4 | Production database + migrate | Empty or unmigrated DB. Apply through `0010_phase14_reliability`. Seed must not run in production. |
| B5 | Object storage buckets | Public + private buckets, DNS for cdn/download, CORS if browser upload is used. |
| B6 | Counsel-reviewed legal | Privacy/terms on the site describe **current** behavior. They are not a substitute for Vietnam/jurisdiction-specific legal review before collecting customer payments. |

## BEFORE PRODUCTION

| ID | Item | Notes |
|----|------|--------|
| P1 | Shared rate-limit store | `RedisRateLimiter` is implemented behind `RateLimiter`. Multi-instance production still needs `REDIS_URL` wired at composition. `TRUSTED_PROXY=none\|cloudflare`. |
| P2 | Live PSP webhook proof | SePay IPN verifies `X-Secret-Key`. Remaining work is the sandbox proof in B1. |
| P3 | Email provider proof | Adapter is wired; fail closed if send fails. Close together with B2. |
| P4 | Staging environment | Separate DB, buckets, auth URLs, keys (`docs/ENVIRONMENTS.md`). Restore drill (`docs/DATABASE.md`). |
| P5 | DNS + TLS | All hostnames in `docs/DEPLOYMENT.md`. |
| P6 | OAuth redirect URIs | Google (if enabled) must list production account origin only. |
| P7 | CSP nonces | CSP still allows `'unsafe-inline'` for scripts/styles (Phase 11). |
| P8 | Backup + restore drill | Postgres and object storage. |
| P9 | Playwright against staging | `.github/workflows/e2e.yml` is `workflow_dispatch`. Sandbox payment E2E is manual. |
| P10 | Catalog/CMS content | Production products, prices, and published blog/docs — no development seed. |

## POST-MVP

| ID | Item | Notes |
|----|------|--------|
| M1 | License key rotation | Dual-key verify; see `docs/LICENSE-SIGNING.md`. |
| M2 | Wire Redis in composition | Interface exists; inject commands from `REDIS_URL`. |
| M3 | Remove `getStorage` alias | Deprecated export in `@khepree/storage`. |
| M4 | Nonce-based CSP | Named in Phase 11 spec. |
| M5 | `app.khepree.com` web products | Domain reserved; not built. |
| M6 | DISTRIBUTOR partner mode | Reserved in partner types. |
| M7 | Impersonation | Explicitly not implemented (Phase 10). |
| M8 | Markdown rendering | Blog/docs split on blank lines only; no markdown library. |
| M9 | In-memory commerce store path | `ponytail:` in commerce store — production uses Drizzle. |
| M11 | SePay recurring | Official docs: Coming Soon. Renewals are a new one-time purchase. |
| M12 | SePay automated refunds | Unsupported. `requestRefund` persists `manual_required`. Finance confirms with `confirmManualRefund()`. |
| M13 | Commerce/Partner class split | `CommerceService` / `PartnerService` remain facades; further file splits are optional. |
