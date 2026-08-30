# Contributing (including AI-assisted work)

Khepree is a **modular monolith**. Large changes land in scoped branches and small commits. Do not open unrelated mega-diffs.

## Change checklist

Every architecture or domain change includes:

1. **Tests** — unit tests for logic; PostgreSQL integration tests (`describe.skipIf(!getDb())`) for transactional behavior. Memory repositories are not proof of Postgres transactions.
2. **Migration** — Drizzle SQL under `packages/db/drizzle/` when schema changes. Rollback is the previous migration plus a documented reverse note in the SQL header.
3. **Docs** — update `README.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCTION-STATUS.md`, `docs/TODOS.md` so they match source.
4. **Rollback** — say how to revert (migration reverse, feature flag, or revert commit).

## AI-assisted development

- Read `CONSTRAINTS.md` and `AGENTS.md` before writing code.
- Implement one phase or one reliability slice at a time. Do not skip ahead with product features.
- Prefer the shortest diff that preserves behavior. Do not rewrite packages to “clean them up.”
- Do not commit secrets, `.env`, or signing keys.
- Ask before committing unless the operator explicitly requested a commit.

## Architecture rules (agents)

- Modular monolith — no microservices split.
- No direct cross-domain table writes. Commerce does not UPDATE entitlements; partners do not INSERT licenses.
- Critical side effects after payment/order transitions go through the PostgreSQL **transactional outbox** (`outbox_events`) in the **same transaction** as the state change.
- Canonical locale (`DEFAULT_LOCALE=vi`), currency (`DEFAULT_CURRENCY=VND`), and access terms (`plan.accessTermDays` / `nextExpiresAt`).
- Authorization is server-side. Do not cache roles globally across requests.
- Production rejects `PAYMENT_PROVIDER=mock` and `EMAIL_PROVIDER=dev`.
