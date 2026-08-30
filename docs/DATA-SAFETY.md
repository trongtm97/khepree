# Data safety runbook

Production data must not depend on a single VPS disk. This document covers PostgreSQL backups, R2 object durability, restore drills, migration safety, Redis expectations, and monitoring.

Related: `docs/DATABASE.md`, `docs/R2.md`, `docs/VPS-SECURITY.md`, `compose.production.yml`.

Scripts: `scripts/backup/`.

## Principles

| Asset | Source of truth | Backup |
|-------|-----------------|--------|
| PostgreSQL | **Yes** — auth, commerce, entitlements, CMS metadata | Encrypted `pg_dump`, off-VPS |
| R2 public/private buckets | **Yes** — file bytes | Versioning + lifecycle (external to VPS) |
| Redis | **No** — rate-limit counters only | None required |
| Docker volumes | **No** — ephemeral compute | Never treat as backup |

---

## 1. PostgreSQL backup

### What is backed up

A full `pg_dump -Fc` captures the entire database, including:

| Domain | Tables (representative) |
|--------|-------------------------|
| Auth | `user`, `session`, `account`, `verification`, `two_factor`, `user_profiles`, `user_consents` |
| Orders / payments | `customers`, `orders`, `order_items`, `payments`, `refunds`, `subscriptions`, `webhook_events` |
| Entitlements / licenses | `entitlements`, `licenses`, `devices`, `activations`, `license_leases`, `license_events` |
| Partners | `partners`, `partner_*`, `wallets`, `commissions`, `referrals` |
| Audit | `audit_logs`, `system_events`, `notifications` |
| CMS metadata | `content_*`, `media_assets`, `url_redirects` |
| Release metadata | `software_releases`, `release_translations` |
| Catalog | `products`, `plans`, `prices`, `features` |
| Platform | `outbox_events` (replay state; safe to restore with DB) |

R2 **object bytes** are not in the dump — only metadata rows (`media_assets`, release file keys). Restore DB + R2 together for full consistency.

### Format and encryption

- **Format:** PostgreSQL custom format (`pg_dump -Fc`) via `scripts/backup/postgres-backup.sh`
- **Encryption:** GPG symmetric (AES256) with passphrase in `/etc/khepree/backup.passphrase`
- **Upload:** **Off-VPS** via `rclone` to `BACKUP_RCLONE_REMOTE` (R2, S3, B2, etc.)
- **Local staging:** `/var/backups/khepree/postgres/staging` — deleted after upload unless `BACKUP_KEEP_LOCAL=1`

Docker volume `khepree_pg_data` is **not** a backup. Disk failure or accidental `docker volume rm` loses data without off-VPS copies.

### Setup (one-time on VPS)

```bash
# Passphrase (store offline copy for disaster recovery)
sudo openssl rand -base64 32 | sudo tee /etc/khepree/backup.passphrase
sudo chmod 600 /etc/khepree/backup.passphrase

# Backup config
sudo cp scripts/backup/backup.env.example /etc/khepree/backup.env
sudo chmod 600 /etc/khepree/backup.env
# Edit BACKUP_RCLONE_REMOTE after: rclone config

# Install tools
sudo apt-get install -y rclone gnupg postgresql-client python3

# Test backup
cd /opt/khepree
./scripts/backup/postgres-backup.sh
```

### Schedule

Install cron from `scripts/backup/cron.example` (daily 03:00 UTC recommended).

### Retention (configurable)

Default GFS policy via `scripts/backup/postgres-retention.sh`:

| Tier | Default | Meaning |
|------|---------|---------|
| Daily | 7 | Newest backup per calendar day, last 7 days |
| Weekly | 4 | Newest backup per ISO week, last 4 weeks |
| Monthly | 3 | Newest backup per month, last 3 months |

Override in `/etc/khepree/backup.env`:

```
BACKUP_RETENTION_DAILY=7
BACKUP_RETENTION_WEEKLY=4
BACKUP_RETENTION_MONTHLY=3
```

Retention runs automatically after each successful backup.

---

## 2. R2 object storage

Public and private data already live off-VPS in Cloudflare R2. See `docs/R2.md` for bucket layout.

### Versioning (enable in Cloudflare dashboard)

Enable **object versioning** on both buckets (or at minimum `R2_BUCKET_PRIVATE`):

- Protects against accidental overwrite/delete of installers and CMS bodies
- Non-current versions incur storage cost — set lifecycle rules

### Retention lifecycle rules

Configure in R2 (not app code):

| Rule | Recommendation |
|------|----------------|
| Abort incomplete multipart uploads | 3–7 days |
| Expire non-current versions | 90 days (adjust to compliance needs) |
| Public marketing orphans | Manual/quarterly — only after no `media_assets` reference |

### Orphan cleanup

Orphans occur when DB write fails after upload, or admin deletes a row without deleting the object.

**Safe cleanup process:**

1. Export `media_assets` keys and release artifact keys from Postgres
2. List bucket objects (rclone or `aws s3 ls` against R2 endpoint)
3. Delete objects with no matching row **after** human review
4. Never bulk-delete private installers referenced by `software_releases`

Scripted orphan scan is operational — not embedded in app code (ponytail: full bucket scan is O(n); run offline quarterly).

---

## 3. Restore drill

> A backup is not valid until restored.

### Staging restore flow

**Never** restore over production automatically. Use an empty staging database.

```bash
# 1. Provision empty Postgres (separate host, container, or local port)
export STAGING_URL="postgresql://staging_user:pass@staging-host:5432/khepree_staging"

# 2. Restore latest remote backup
cd /opt/khepree
./scripts/backup/postgres-restore.sh \
  --latest \
  --target-url "${STAGING_URL}" \
  --confirm-not-production

# 3. Apply any migrations newer than the dump
DATABASE_URL="${STAGING_URL}" pnpm db:migrate

# 4. Smoke tests (staging only)
DATABASE_URL="${STAGING_URL}" pnpm --filter @khepree/db test  # if integration fixtures apply
curl -sS https://staging-account.example.com/healthz          # against staging apps
# Manual: sign-in, open product slug, verify entitlement row for test user
```

`postgres-restore.sh` refuses targets whose host matches `PRODUCTION_DB_HOST_MARKERS` (default: `postgres` — the Docker service name on the production stack).

### Drill schedule

- **Quarterly** minimum
- After any backup-system change (new rclone remote, passphrase rotation)
- Log result in your ops journal (date, backup file, staging URL, pass/fail)

---

## 4. Backup before migration

Schema migrations are irreversible without restore. App-only deploys do not need a fresh backup.

### When to require backup

| Deploy type | Backup required? |
|-------------|------------------|
| App code only, no new SQL in `packages/db/drizzle/` | No (optional) |
| New migration SQL (`0009`–`0013` or future) | **Yes** |
| Destructive migration (drop column, rewrite money) | **Yes** + staging rehearsal |

### Command

```bash
# Warn if stale; create backup if missing
./scripts/backup/pre-migrate-backup.sh

# Block deploy if backup cannot be verified/created
./scripts/backup/pre-migrate-backup.sh --require && \
  docker compose -f compose.production.yml --env-file /etc/khepree/.env.production up -d
```

`BACKUP_MAX_AGE_HOURS` (default 26) defines “recent enough” for migration deploys.

Trivial app-only deploy:

```bash
docker compose -f compose.production.yml --env-file /etc/khepree/.env.production up -d web api
# No pre-migrate-backup needed when migrate service has nothing new to apply
```

---

## 5. Redis

Redis holds **ephemeral rate-limit state** only (`@khepree/security` Redis backend). It is **not** source of truth.

| Property | Policy |
|----------|--------|
| Backup | Not required |
| Restore | N/A — counters reset on flush/restart |
| Commerce / access data | Must live in PostgreSQL only |
| Container restart | Acceptable — brief rate-limit window reset |

Do not store orders, entitlements, sessions, or license state in Redis.

---

## 6. Database monitoring

`scripts/backup/db-health-check.sh` reports:

| Check | Default warn | Default crit |
|-------|--------------|--------------|
| Active connections | ≥ 40 | ≥ 80 |
| Postgres volume disk % | ≥ 75% | ≥ 90% |
| Backup age | ≥ 30h | ≥ 50h |

```bash
./scripts/backup/db-health-check.sh
./scripts/backup/db-health-check.sh --json
```

Exit codes: `0` OK, `1` warn, `2` crit — wire to cron + email/Slack.

Override thresholds via environment:

```bash
DB_MAX_CONNECTIONS_WARN=40 DB_MAX_CONNECTIONS_CRIT=80 \
BACKUP_AGE_WARN_HOURS=30 BACKUP_AGE_CRIT_HOURS=50 \
./scripts/backup/db-health-check.sh
```

Also monitor from outside: disk space on VPS root volume, Cloudflare R2 usage, backup remote bucket object count.

---

## 7. Disaster recovery summary

```
┌─────────────────┐     daily pg_dump      ┌──────────────────┐
│ VPS Postgres    │ ──────────────────────►│ Off-VPS (rclone) │
│ (ephemeral disk)│     encrypted .gpg     │ R2 / S3 / B2     │
└─────────────────┘                        └──────────────────┘
         │                                           │
         │ metadata only                             │ object bytes
         ▼                                           ▼
┌─────────────────┐                        ┌──────────────────┐
│ media_assets    │◄──── references ──────►│ R2 public/private│
│ software_releases│                       │ (versioned)      │
└─────────────────┘                        └──────────────────┘
```

**Recovery order:**

1. Provision new VPS + Docker stack
2. Restore latest `pg_dump` to new Postgres
3. Run `pnpm db:migrate` if needed
4. Verify R2 buckets intact (versioning/recovery if objects lost)
5. Start apps, smoke test, switch DNS

---

## Script reference

| Script | Purpose |
|--------|---------|
| `postgres-backup.sh` | `pg_dump -Fc`, encrypt, upload, retention |
| `postgres-retention.sh` | GFS prune on remote |
| `postgres-restore.sh` | Staging restore only (`--confirm-not-production`) |
| `pre-migrate-backup.sh` | Verify/create backup before schema deploy |
| `db-health-check.sh` | Connections, disk, backup age |
| `backup.env.example` | Config template for `/etc/khepree/backup.env` |
| `cron.example` | Sample crontab entries |
