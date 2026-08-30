# Khepree Platform

Monorepo for the Khepree global software ecosystem.

**Software that helps you go further.**

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (optional, for PostgreSQL locally)

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev:web      # Marketing → http://localhost:3000
```

## Development ports

| App     | Port | Domain (production)   |
|---------|------|-----------------------|
| web     | 3000 | khepree.com           |
| account | 3001 | account.khepree.com   |
| admin   | 3002 | admin.khepree.com     |
| partner | 3003 | partner.khepree.com   |
| api     | 3004 | api.khepree.com       |

## Scripts

| Command           | Description                    |
|-------------------|--------------------------------|
| `pnpm dev`        | Start all apps (Turborepo)     |
| `pnpm build`      | Production build all apps      |
| `pnpm typecheck`  | TypeScript strict check        |
| `pnpm lint`       | ESLint                         |
| `pnpm test`       | Unit tests (DB-less). Postgres `skipIf` tests run in CI integration. |
| `pnpm test:e2e`   | Playwright smoke (`E2E=1`). Not in the unit PR job. |
| `pnpm db:migrate` | Apply Drizzle migrations       |
| `pnpm db:seed`    | Idempotent development seed    |

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Apps:** Next.js 16 App Router, React 19, TypeScript strict
- **UI:** Tailwind CSS v4, `@khepree/ui`
- **Data:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth (`@khepree/auth`) — identity only
- **Storage:** Cloudflare R2 via `@khepree/storage` (public + private buckets)

## Phase status

| Phase | Status |
|-------|--------|
| 01–06 | ✅ Complete |
| **06.5** | ✅ Architecture hardening |
| 07–11 | ✅ Complete |
| **12** | ✅ Production readiness docs + CI + public IA. Not a go-live certificate. |
| **13** | ✅ Vietnam-first locale, VND, SePay. Not production-ready — B1 sandbox proof open. |
| **13.1** | ✅ SePay form field order, manual refund commit, `payment_voided`. B1 still open. |
| **14** | ✅ Platform reliability (outbox, composition root, partner/CMS/CI). **Not production-ready.** |
| **15** | ✅ Product Studio, software releases, CMS editor. Not production-ready. |
| **16** | ✅ Public website consistency, Vietnamese copy, product/CMS/SEO polish. **Not production-ready.** |

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/PRODUCTION-STATUS.md](./docs/PRODUCTION-STATUS.md), and [CONTRIBUTING.md](./CONTRIBUTING.md).

## Environment

Copy `.env.example` to `.env`. Production requires:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
- `R2_BUCKET_PUBLIC` **and** `R2_BUCKET_PRIVATE` (no fallback)
- App URLs (`APP_URL`, `ACCOUNT_URL`, …)

Private bucket missing in production **fail fast** — mock storage is dev/test only.

## License

Proprietary — Khepree. All rights reserved.
