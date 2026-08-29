# Khepree — Agent Instructions

Read `CONSTRAINTS.md` before writing code. Do not weaken it to make a change pass.

## Project

Global software ecosystem — monorepo at `khepree.com` and related domains.
See `docs/ARCHITECTURE.md` for domain map and package boundaries.

## Commands

```bash
pnpm install
pnpm dev:web          # Marketing site :3000
pnpm dev              # All apps
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:push          # Requires DATABASE_URL
pnpm db:seed
```

## Tech stack

- Next.js 16, React, TypeScript strict, Tailwind v4
- PostgreSQL + Drizzle ORM
- Better Auth (identity only)
- pnpm workspaces + Turborepo

## Skills workflow

Route work through `.agents/skills/using-agent-skills/SKILL.md`.

Installed packs:
- **addyosmani/agent-skills** — spec, plan, build, test, review, ship
- **caveman / ponytail** — token efficiency, minimal code

## Non-negotiables

- Server Components first; `"use client"` only when needed
- Feature-based entitlement, never `if (plan === "PRO")`
- No secrets in browser bundle
- Only implement the requested phase — do not skip ahead
