# Remaining work ledger (Phase 17.0)

Items are categorized as they stood after Phase 17.0 system consistency work. **BLOCKER** means do not send real customers to production until it is resolved. This list is not an implementation backlog for a later product phase.

Phase 17.0 added migrate-from-zero tests, outbox stale-lock recovery + dedicated worker, `getRateLimiter()` wired to Redis in production, and E2E CI smoke (local stack + staging URL mode). **B1 is still open.** Email delivery is implemented behind an adapter but **not** proven with a live send. Do not claim production-ready.

## BLOCKER

| ID | Item | Notes |
|----|------|--------|
| B1 | Live payment provider | SePay adapter is implemented (`PAYMENT_PROVIDER=sepay`). Development may still use `mock`. **Not resolved:** verified SePay Sandbox checkout + IPN per `docs/SEPAY-SANDBOX.md`. |
| B2 | Transactional email delivery | `ResendEmailAdapter` exists. Production rejects `EMAIL_PROVIDER=dev`. **Not resolved:** a real message delivered and observed. |
| B3 | Production secrets | Production Ed25519 private key, `BETTER_AUTH_SECRET`, R2 keys, SePay credentials, Resend key, `REDIS_URL`, `OUTBOX_WORKER_SECRET`, and a real `DATABASE_URL` must exist in secret infrastructure — not in git. |
| B4 | Production database + migrate | Empty or unmigrated DB. Apply through `0013_phase16_url_redirects`. Seed must not run in production. |
| B5 | Object storage buckets | Public + private buckets, DNS for cdn/download, CORS if browser upload is used. |
| B6 | Counsel-reviewed legal | Privacy/terms on the site describe **current** behavior. They are not a substitute for Vietnam/jurisdiction-specific legal review before collecting customer payments. |

## BEFORE PRODUCTION

| ID | Item | Notes |
|----|------|--------|
| P1 | Shared rate-limit store | `getRateLimiter()` uses Redis when `REDIS_URL` is set; production boot fails without it. Operate Redis in staging before go-live. |
| P2 | Live PSP webhook proof | SePay IPN verifies `X-Secret-Key`. Remaining work is the sandbox proof in B1. |
| P3 | Email provider proof | Adapter is wired; fail closed if send fails. Close together with B2. |
| P4 | Staging environment | Separate DB, buckets, auth URLs, keys (`docs/ENVIRONMENTS.md`). Restore drill (`docs/DATABASE.md`). |
| P5 | DNS + TLS | All hostnames in `docs/DEPLOYMENT.md`. |
| P6 | OAuth redirect URIs | Google (if enabled) must list production account origin only. |
| P7 | CSP nonces | CSP still allows `'unsafe-inline'` for scripts/styles (Phase 11). |
| P8 | Backup + restore drill | Postgres and object storage. |
| P9 | Playwright against staging | `.github/workflows/e2e.yml` supports staging dispatch with base URL inputs. Sandbox payment E2E is manual. |
| P10 | Catalog/CMS content | Production products, prices, and published blog/docs — no development seed. |
| P11 | Outbox worker schedule | Wire cron to `POST /api/v1/internal/outbox/run` or run `pnpm outbox:run` on an interval in production. |

## POST-MVP

| ID | Item | Notes |
|----|------|--------|
| M1 | License key rotation | Dual-key verify; see `docs/LICENSE-SIGNING.md`. |
| M2 | Remove `getStorage` alias | Deprecated export in `@khepree/storage`. |
| M3 | Nonce-based CSP | Named in Phase 11 spec. |
| M4 | `app.khepree.com` web products | Domain reserved; not built. |
| M5 | DISTRIBUTOR partner mode | Reserved in partner types. |
| M6 | Impersonation | Explicitly not implemented (Phase 10). |
| M7 | Markdown rendering | Blog/docs split on blank lines only; no markdown library. |
| M8 | In-memory commerce store path | `ponytail:` in commerce store — production uses Drizzle. |
| M9 | SePay recurring | Official docs: Coming Soon. Renewals are a new one-time purchase. |
| M10 | SePay automated refunds | Unsupported. `requestRefund` persists `manual_required`. Finance confirms with `confirmManualRefund()`. |
| M11 | Commerce/Partner class split | `CommerceService` / `PartnerService` remain facades; further file splits are optional. |

## Migration inventory (0000–0013)

| Tag | Phase | Scope |
|-----|-------|--------|
| `0000`–`0008` | 01–13 | Foundation through Vietnam/SePay — **frozen, do not rewrite** |
| `0009_phase13_1_commerce_correctness` | 13.1 | `voided` statuses, `provider_subscription_id` |
| `0010_phase14_reliability` | 14 | `outbox_events`, media BIGINT, partner default VND |
| `0011_phase15_2_software_releases` | 15 | `software_releases`, `release_translations` |
| `0012_phase15_3_cms` | 15 | CMS categories, author, featured image, scheduling columns |
| `0013_phase16_url_redirects` | 16 | `url_redirects` |

Verify: empty Postgres → `pnpm db:migrate` → `packages/db/src/schema/migrations.from-zero.pg.test.ts` (CI integration job).
