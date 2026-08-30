# @khepree/db — Database Foundation

Central PostgreSQL access for the Khepree monorepo via Drizzle ORM.

## Prerequisites

- Docker (recommended) or local PostgreSQL 17+
- `DATABASE_URL` in root `.env`

## Quick start

```bash
# 1. Start PostgreSQL (`POSTGRES_PORT` in `.env` if 5432 is taken)
docker compose up -d postgres

# 2. Copy env template (if not done)
cp .env.example .env

# 3. Generate migration from schema changes
pnpm db:generate

# 4. Apply migrations
pnpm db:migrate

# 5. Seed development sample data (optional)
pnpm db:seed
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate SQL migrations from Drizzle schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev only — prefer migrate) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Idempotent development seed |

## Package exports

```typescript
import {
  getDb,
  requireDb,
  withTransaction,
  createPublicId,
  authSchema,
  createDrizzleAuditService,
  findProductBySlug,
} from "@khepree/db";
```

- **`getDb()`** — returns `null` when `DATABASE_URL` is not configured
- **`requireDb()`** — throws if database is unavailable
- **`withTransaction(db, fn)`** — run work in a transaction
- **`authSchema`** — Better Auth table map (do not duplicate auth tables)

## Schema domains

| Domain | Tables |
|--------|--------|
| Identity | `user`, `session`, `account`, `verification`, `user_profiles`, `organizations`, `memberships` |
| Catalog | `products`, `plans`, `features`, `plan_features`, `prices` |
| Content | `content_entries`, `content_versions`, `content_categories`, `media_assets`, `url_redirects` |
| Release | `software_releases`, `release_translations` |
| Reliability | `outbox_events` |
| Commerce | `customers`, `orders`, `order_items`, `payments`, `subscriptions`, `webhook_events` |
| Entitlement | `entitlements`, `licenses`, `devices`, `activations`, `license_leases`, `license_events` |
| Partners | `partners`, `partner_tiers`, `partner_prices`, `wallets`, `wallet_transactions`, `referrals`, `referral_attributions`, `commissions`, `partner_memberships`, `partner_customers`, `partner_issues` |
| System | `audit_logs`, `notifications`, `system_events` |

## Migration inventory

Applied set: `0000` … `0013_phase16_url_redirects`. Migrations `0000`–`0008` are frozen. Phase 14–16 additions: `0009`–`0013`.

Integration test `src/schema/migrations.from-zero.pg.test.ts` verifies critical tables after migrate-from-zero (runs in CI integration job).

- **Public IDs:** `public_id` columns use prefixed base64url tokens (`createPublicId("prod")`) for customer-facing references.
- **Money:** stored as `amount_minor` integer + ISO `currency` — never floats.
- **Financial immutability:** orders, payments, license history use `onDelete: "restrict"`.
- **Soft delete:** only `organizations` and `content_entries` (`deleted_at`).
- **Better Auth:** core auth tables live in `identity.ts` — extend via `user_profiles`, do not duplicate.

## Development seed

Seeds one product clearly labeled **DEVELOPMENT SAMPLE** — no fake commercial plans or pricing tiers.

## Audit

Use `createDrizzleAuditService(db)` implementing the append-only `AuditService` interface. Audit rows are never updated or deleted.
