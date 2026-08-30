# Database (production)

Schema lives in `@khepree/db` (Drizzle). Applied files: `packages/db/drizzle/0000_*.sql` through `0013_phase16_url_redirects.sql`. Migrations `0000`–`0008` are frozen; Phase 13.1–16 additions are `0009`–`0013` (see `packages/db/README.md` and `docs/TODOS.md` migration inventory).

## Migration workflow

1. Change schema in `packages/db/src/schema`.
2. Generate: `pnpm db:generate` (review the SQL).
3. Apply in the target environment: `pnpm db:migrate` with that environment’s `DATABASE_URL`.
4. Ship app code that expects the new schema **after** migrate succeeds.

Prefer migrate over `pnpm db:push`. Push is for emergency local schema sync only.

Order for a release that includes schema: migrate first, then deploy apps. If the app is backward-compatible with the old schema, you can migrate after deploy — only when the migration is additive and the running code does not require new columns.

## Backup strategy

Use the PostgreSQL tooling your operator already runs (for example `pg_dump` / continuous WAL archiving). This repo does not embed a vendor backup product.

Minimum:

- Automated backups of the production database on a schedule that matches your RPO.
- Encryption at rest for backup storage.
- Retention long enough to recover from a bad migration discovered days later.
- Backups stored **off** the production database host.

## Restore test strategy

A backup that has never been restored is not a backup.

1. Provision an empty instance (not production).
2. Restore the latest backup.
3. Run `pnpm db:migrate` only if the dump is from before current head (usually the dump already includes schema).
4. Smoke: sign-in against a copy of identity tables, open a product slug, confirm entitlement rows exist for a known fixture user if you restore anonymized data.

Perform this restore drill on a schedule (for example quarterly) and after any backup-system change.

## Seed policy

`pnpm db:seed` inserts a **DEVELOPMENT SAMPLE** product and related local fixtures. It is idempotent and **must not** run against production or against a database that serves real customers.

Production catalog, CMS, and prices are created through admin (or a controlled import), never by the development seed.

## Rollback considerations

Drizzle migrations in this repo are forward SQL. There is no automatic down migration.

If a release is bad:

- **App-only rollback** — redeploy the previous app revision if the new schema is backward compatible.
- **Schema rollback** — restore from backup to a point before the migration, or apply a hand-written reverse migration reviewed like any other schema change. Do not `db:push` production to an older schema.
- **Data** — entitlement, orders, payments, and audit logs are financial/access records. Do not truncate them to “fix” a deploy.

Destructive migrations (drop column, rewrite money, change unique keys) need a two-step release: additive migrate + dual-write or expand/contract, then a later drop. Do not combine drop-and-replace in one production shot without a restore plan.
