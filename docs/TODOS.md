# Remaining work ledger (Phase 12 audit)

Items are categorized as they stood at the end of Phase 12. **BLOCKER** means do not send real customers to production until it is resolved. This list is not an implementation backlog for a later product phase.

## BLOCKER

| ID | Item | Notes |
|----|------|--------|
| B1 | Live payment provider | `PAYMENT_PROVIDER` is only `mock`. Mock checkout is development-only. Production cannot take real money. |
| B2 | Transactional email delivery | `createEmailAdapter()` always returns `DevPreviewEmailAdapter`. Production env requires `EMAIL_PROVIDER_API_KEY` but mail is not sent. Password reset / receipts will appear to succeed. |
| B3 | Production secrets | Production Ed25519 private key, `BETTER_AUTH_SECRET`, R2 keys, webhook secrets, and a real `DATABASE_URL` must exist in secret infrastructure — not in git. None of these are created by this phase. |
| B4 | Production database + migrate | Empty or unmigrated DB. Seed must not run in production. |
| B5 | Object storage buckets | Public + private buckets, DNS for cdn/download, CORS if browser upload is used. |
| B6 | Counsel-reviewed legal | Privacy/terms on the site describe **current** behavior. They are not a substitute for jurisdiction-specific legal review before collecting customer payments. |

## BEFORE PRODUCTION

| ID | Item | Notes |
|----|------|--------|
| P1 | Shared rate-limit store | In-memory limiter (`ponytail:` Redis). Multi-instance production will not share counters. |
| P2 | Payment webhook secret for the live PSP | Replace mock webhook verification; keep provider objects out of the domain model. |
| P3 | Email provider adapter | Wire a real sender when B2 is addressed; fail closed if send fails. |
| P4 | Staging environment | Separate DB, buckets, auth URLs, keys (`docs/ENVIRONMENTS.md`). Restore drill (`docs/DATABASE.md`). |
| P5 | DNS + TLS | All hostnames in `docs/DEPLOYMENT.md`. |
| P6 | OAuth redirect URIs | Google (if enabled) must list production account origin only. |
| P7 | CSP nonces | CSP still allows `'unsafe-inline'` for scripts/styles (Phase 11). Tighten before a high-threat launch if required. |
| P8 | Backup + restore drill | Postgres and object storage. |
| P9 | Playwright against staging | `E2E=1 pnpm test:e2e` is local; CI default job does not run it. |
| P10 | Catalog/CMS content | Production products, prices, and published blog/docs — no development seed. |

## POST-MVP

| ID | Item | Notes |
|----|------|--------|
| M1 | License key rotation | Dual-key verify; see `docs/LICENSE-SIGNING.md`. |
| M2 | Redis (or equivalent) rate limits | Upgrade path named in `packages/security/src/rate-limit.ts`. |
| M3 | Remove `getStorage` alias | Deprecated export in `@khepree/storage`. |
| M4 | Nonce-based CSP | Named in Phase 11 spec. |
| M5 | `app.khepree.com` web products | Domain reserved; not built. |
| M6 | DISTRIBUTOR partner mode | Reserved in partner types. |
| M7 | Impersonation | Explicitly not implemented (Phase 10). |
| M8 | Markdown rendering | Blog/docs split on blank lines only; no markdown library. |
| M9 | In-memory commerce store path | `ponytail:` in commerce store — production uses Drizzle. Confirm no production traffic hits the memory store. |
| M10 | Partner 30-day reseller term | `ponytail:` in reseller service. |
