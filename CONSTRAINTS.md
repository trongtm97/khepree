# Constraints

Last reviewed: 2026-08-30 — Phase 12 production readiness

Read this file before writing code. Do not weaken it to make a change pass.

## Floor (always enforced)

- No new suppression comments: `@ts-ignore`, `eslint-disable`, `# noqa`, `@ts-expect-error` without documented reason
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a reason in the commit message
- No secrets in source or `NEXT_PUBLIC_*` env vars
- No `any` without explicit justification
- No duplicated business logic across apps — use `packages/`
- No hard-coded plan names for authorization — use feature-based entitlement
- No fake social proof, ratings, or testimonials on public pages
- This file does not get weakened to make a change pass

## Enforced with commands

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Types | Zero type errors | `pnpm typecheck` | task end |
| Lint | Zero errors | `pnpm lint` | task end |
| Build | All apps build | `pnpm build` | task end |
| Tests | All tests pass | `pnpm test` | task end |
| Secrets | No secrets committed | manual / `.env.example` only | review |

## Architecture boundaries

- Business logic in `packages/`, not duplicated in `apps/`
- Auth ≠ Entitlement ≠ License — keep separate
- UI does not replace server-side authorization
- Money: integer minor units + currency, never float
- Database changes via Drizzle migrations only

## Measured, not yet enforced

| Metric | Today | Direction |
|--------|-------|-----------|
| Test coverage | minimal (foundation) | must not fall |
| E2E (Playwright) | `apps/e2e` — skipped unless `E2E=1` | `E2E=1 pnpm test:e2e` against local apps |

## Exceptions

| ID | Rule | Path | Reason | Expires |
|----|------|------|--------|---------|
| — | — | — | none yet | — |
