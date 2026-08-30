# Khepree — Agent Instructions

Read `CONSTRAINTS.md` before writing code. Do not weaken it to make a change pass.

## Project

Global software ecosystem — monorepo at `khepree.com` and related domains.
See `docs/ARCHITECTURE.md` for domain map, phase status, and package boundaries.

## Commands

```bash
pnpm install
pnpm dev:web          # Marketing site :3000
pnpm dev              # All apps
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:migrate       # Requires DATABASE_URL
pnpm db:seed
```

## Tech stack

- Next.js 16, React, TypeScript strict, Tailwind v4
- PostgreSQL + Drizzle ORM
- Better Auth (identity only)
- pnpm workspaces + Turborepo

## Phase status (do not skip)

- **Phases 01–06:** complete
- **Phase 06.5:** architecture hardening — complete
- **Phase 07:** commerce — complete
- **Phase 08:** entitlement + licensing — complete
- **Phase 09:** partner + reseller platform — complete
- **Phase 10:** admin control center — complete
- **Phase 11:** production security, testing, observability — complete
- **Phase 12:** final production readiness (docs, CI, public IA) — complete; **not** a production-ready claim
- **Phase 13:** Vietnam-first locale, VND, SePay payment adapter, commerce hardening — complete; **not** a production-ready claim; B1 sandbox IPN proof still open
- **Phase 13.1:** SePay form field order, manual refund commit, `payment_voided` — complete; **not** a production-ready claim; do not go-live; B1 still open
- **Phase 14:** platform reliability — transactional outbox, `@khepree/platform` composition root, partner/CMS/auth/email/CI hardening — complete; **not** a production-ready claim; B1 still open
- **Phase 15:** Product Studio, software releases, CMS editor — complete; **not** a production-ready claim; B1 still open
- **Phase 16:** public website consistency, Vietnamese copy, product/CMS/SEO polish — complete in source; **not** a production-ready claim; B1 still open

Packages already implemented: `@khepree/auth`, `@khepree/catalog`, `@khepree/commerce`, `@khepree/storage`, `@khepree/db`, `@khepree/ui`, `@khepree/config`, `@khepree/security`, `@khepree/entitlement`, `@khepree/licensing`, `@khepree/reseller`, `@khepree/sdk`, `@khepree/events`, `@khepree/platform`.

Ops docs: `docs/DEPLOYMENT.md`, `docs/ENVIRONMENTS.md`, `docs/PRODUCTION-STATUS.md`.

Later phases: TBD.

## Skills workflow

Route work through `.agents/skills/using-agent-skills/SKILL.md`.

## Non-negotiables

- Server Components first; `"use client"` only when needed
- Feature-based entitlement, never `if (plan === "PRO")`
- No secrets in browser bundle
- Money: BIGINT minor units + ISO currency
- Private R2 bucket never falls back to public
- i18n via translation tables, not `name_en` columns
- Only implement the requested phase — do not skip ahead
- Durable outbox for critical commerce side effects; composition via `@khepree/platform`
