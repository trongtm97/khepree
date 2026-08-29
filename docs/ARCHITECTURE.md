# Khepree Architecture

## Domain map

| Domain | App | Purpose |
|--------|-----|---------|
| khepree.com | `apps/web` | Marketing, SEO, products, blog, docs |
| account.khepree.com | `apps/account` | Customer account |
| app.khepree.com | (future) | Web products |
| partner.khepree.com | `apps/partner` | Reseller / affiliate |
| admin.khepree.com | `apps/admin` | Internal administration |
| api.khepree.com | `apps/api` | Public/internal APIs |
| cdn.khepree.com | R2 public bucket | Static assets |
| download.khepree.com | R2 private + signed URLs | Protected downloads |

## Package boundaries

| Package | Responsibility |
|---------|----------------|
| `@khepree/config` | Typed env, domain constants, production validation |
| `@khepree/types` | Shared TypeScript contracts, money types |
| `@khepree/db` | Drizzle schema, client, migrations |
| `@khepree/auth` | Better Auth — identity only |
| `@khepree/security` | RBAC permission matrix |
| `@khepree/entitlement` | Feature-based authorization — source of truth for access |
| `@khepree/licensing` | License keys, device activation, Ed25519 leases |
| `@khepree/reseller` | Partner org, referral attribution, wallet ledger, reseller issue/renew |
| `@khepree/sdk` | Client-neutral types and error codes (no secrets) |
| `@khepree/commerce` | Orders, payments, subscriptions, provider adapters |
| `@khepree/catalog` | Products, plans, features, CMS content, media |
| `@khepree/storage` | R2 adapter — public/private buckets isolated |
| `@khepree/ui` | Design system |

## Core principles

1. **Auth ≠ Entitlement ≠ License** — three separate systems
2. **Feature-based authorization** — never `if (plan === "PRO")`
3. **Money as BIGINT minor units** — no floating point; use `@khepree/types/money`
4. **Payment provider adapter** — billing events normalize before entitlement; Stripe (or any SDK) objects are never domain models
5. **i18n via translation tables** — `product_translations`, not `name_en` columns
6. **Server Components first** — client only when interaction requires it
7. **Private storage never falls back to public bucket**

## Storage consistency (CMS)

Content body uploads happen **outside** database transactions. Each content version gets an immutable object key (`prv/content/{entryId}/{locale}/v{versionNumber}.md`). Failed metadata writes may leave orphan objects — acceptable in pre-production; cleanup is operational.

## Order state machine

| Status | Valid next states |
|--------|---------------------|
| `draft` | `pending_payment`, `cancelled` |
| `pending_payment` | `paid`, `cancelled` |
| `paid` | `refunded`, `partially_refunded` |
| `partially_refunded` | `refunded` |
| `cancelled` | — |
| `refunded` | — |

Payment records keep their own status lifecycle (`pending` → `succeeded` | `failed`; `succeeded` → `refunded`). Partial refunds change the **order** status only.

Checkout intent creates a draft order, a provider-hosted checkout session, then a pending payment. Access is granted later by the entitlement engine from **normalized commerce events** — never from a success redirect URL. Full refunds **suspend** entitlements; they are never deleted.

Webhook ingress: `POST /api/v1/webhooks/payments/[provider]` — verify provider authenticity, persist `(provider, eventId)` uniquely, apply idempotently inside a transaction, audit, then run idempotent entitlement hooks after commit. The first adapter is `MockDevelopmentPaymentProvider`.

## Entitlement, licenses, devices (Phase 08)

- Entitlement is the source of truth. `licenses.status` is denormalized for UI. Feature checks use the entitlement snapshot (`devices.max`, never `if (plan === "PRO")`).
- License keys are random identifiers (`KHPR-…`). Only the SHA-256 hash is stored; prefix/last4 are display hints. Rights are not encoded in the key.
- Devices are keyed by `(principalType, principalId, installationHash)` of a client installation id — no MAC/CPU/disk serials.
- At most one **active** activation per `(licenseId, deviceId)` (partial unique index). Device limits are enforced under a license row lock.
- Ed25519 leases (`signLease` / `verifyLease`) cover a TTL plus a configurable grace window. Offline revocation is eventual: a lease stays cryptographically valid until `exp` (+ grace). Live APIs re-check entitlement.
- Account UI: `/licenses`, `/devices` (owner deactivate + cooldown). APIs: `POST /api/v1/licenses/{activate,refresh,deactivate}`, `GET /api/v1/licenses/me`, `GET /api/v1/devices`, `GET /api/v1/me/entitlements`.

## Partner + reseller (Phase 09)

- Partner is a business entity with roles `PARTNER_OWNER` / `PARTNER_MANAGER` / `PARTNER_SALES`. Status: `pending` | `active` | `suspended` | `rejected`. Modes: `REFERRAL`, `RESELLER` (`DISTRIBUTOR` reserved).
- Partners never write the entitlement table. Reseller issue/renew: validate scope + partner price → debit wallet (idempotent ledger) → `entitlement.grantEntitlement({ source: "reseller" })` / `updateEntitlement`.
- Wallet is a ledger (`CREDIT` `DEBIT` `ADJUSTMENT` `REFUND` `REVERSAL`) with unique `(walletId, idempotencyKey)`. Cached `balance_minor` is updated in the same lock as the transaction row. No negative balance unless `allow_negative_balance`.
- Referral attribution is **first-touch signup**, not last-click. Clicks store `sha256(visitorId)` only. Order commission requires a signup attribution for the paying user.
- Commissions: `pending` → `approved` → `available` → `paid` (wallet CREDIT) or `reversed`. Full refund reverses unpaid rows without a wallet move; paid rows post `REVERSAL`.
- Admin uses `setPartnerStatus`, `setPartnerTier`, `setPartnerPrice`, commission approve-pay, and privileged wallet `ADJUSTMENT` (reason + audit required).
- App: `apps/partner` (`partner.khepree.com`, :3003). Public landing: `apps/web` `/[locale]/r/[code]`.
- Partner auth uses `PARTNER_URL` as Better Auth `baseURL` so localhost ports do not share account cookies. Identity is still the same user table.

## Admin control center (Phase 10)

- `apps/admin` (`admin.khepree.com`, :3002) is internal. No public sign-up. Gate is `user_profiles.globalRole` via `@khepree/security` permissions — never an `isAdmin` boolean.
- Staff: `SUPPORT` | `FINANCE` | `ADMIN` | `SUPER_ADMIN`. Mutations go through domain services (entitlement grant/revoke/reissue, catalog archive/retire, licensing `blockDevice`, reseller wallet/status). The UI does not raw-insert entitlements.
- Audit log is append-only. Standard admin UI cannot edit or delete it.
- Production: `ADMIN` and `SUPER_ADMIN` must have MFA enabled before using admin. Impersonation is not implemented.
- Admin auth uses `ADMIN_URL` as Better Auth `baseURL` (same identity table, port-isolated cookies on localhost).

## Production hardening (Phase 11)

- Rate limits live in `@khepree/security` (in-memory sliding window, fail closed). Auth, license activate/refresh, webhooks, media, and admin/partner POSTs are covered. Multi-instance needs Redis.
- Security headers (CSP `frame-ancestors 'none'`, Referrer-Policy, nosniff, Permissions-Policy, HSTS in production) are applied from each app `proxy.ts`.
- Structured JSON logs via `createLogger` in `@khepree/config` redact password, authorization, cookies, secrets, tokens, and private keys.
- `validateRuntimeEnv()` runs from `instrumentation.ts` on Node boot (skipped during `next build`). Production requires license signing keys, email provider, R2, and webhook secret.
- Private product downloads (`media.context = product:<id>`) require entitlement before a presigned URL is issued. Media upload/complete require a session; owner is not client-supplied.
- Mock checkout is development-only. Playwright critical flows: `E2E=1 pnpm test:e2e` with apps running.
- Findings: `docs/SPEC-phase-11-security.md`.

## Phase roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 01 | ✅ Complete | Monorepo scaffold, design system, app shells |
| 02 | ✅ Complete | Marketing site, i18n, SEO shell |
| 03 | ✅ Complete | Database schema foundation, Drizzle migrations |
| 04 | ✅ Complete | Better Auth, account app, sessions, audit |
| 05 | ✅ Complete | R2 storage, CMS content/media services |
| 06 | ✅ Complete | Product catalog, plans, features, public product pages |
| **06.5** | ✅ Complete | Architecture hardening before commerce |
| **07** | ✅ Complete | Commerce — checkout, payments, subscriptions, webhooks |
| **08** | ✅ Complete | Entitlement engine, license keys, device activation, Ed25519 leases |
| **09** | ✅ Complete | Partner portal, referral attribution, reseller issue via entitlement, wallet ledger |
| **10** | ✅ Complete | Admin control center — RBAC, domain commands, audit, no impersonation |
| **11** | ✅ Complete | Production security, rate limits, headers, logging, E2E, error UX |
| **12** | ✅ Complete | Public IA/SEO audit, CI quality gate, deployment/env/DB/R2/signing docs. **Not production-ready** — see `docs/PRODUCTION-STATUS.md` |
| 13+ | Planned | Later phases |

Each phase inherits project constraints in `CONSTRAINTS.md`. Do not skip phases.

## Dev reset (pre-production)

After destructive migrations:

```bash
pnpm db:migrate
pnpm db:seed
```
