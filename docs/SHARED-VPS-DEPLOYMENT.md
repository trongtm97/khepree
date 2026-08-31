# Shared VPS deployment (Khepree + CHAPMEE)

Deploy Khepree on the **same VPS** as CHAPMEE without touching CHAPMEE containers, volumes, databases, or ports 80/443.

**This guide does not claim production-ready.** SePay stays `SEPAY_ENV=sandbox` until B1 E2E passes. Fill all secrets manually.

## Architecture

```
Internet :443/:80
    │
    ▼
chapmee-caddy (existing — do NOT recreate)
    │  chapmee_chapmee_net (external Docker network)
    ├── chapmee-web (CHAPMEE — unchanged)
    ├── khepree-web:3000
    ├── khepree-account:3001
    ├── khepree-admin:3002
    ├── khepree-partner:3003
    └── khepree-api:3004

khepree_internal (private bridge)
    ├── khepree-postgres
    ├── khepree-redis
    └── khepree-worker
```

Khepree uses **its own** PostgreSQL, Redis, SMTP mailbox, S3 buckets, Google OAuth client, and license keys. Nothing is shared with CHAPMEE except `chapmee-caddy` and `chapmee_chapmee_net`.

## Strict rules (do not break CHAPMEE)

**Never run:**

```bash
docker compose -f /opt/chapmee/app/compose*.yml down
docker stop chapmee-*
docker rm chapmee-*
docker network rm chapmee_chapmee_net
docker volume prune
docker system prune
```

**Never** replace `/opt/chapmee/app/Caddyfile.production` wholesale. Only append Khepree blocks after backup.

## Prerequisites

- VPS with CHAPMEE already running (`chapmee-caddy`, `chapmee_chapmee_net`)
- DNS A/AAAA records for Khepree domains → VPS IP (direct DNS recommended: `TRUSTED_PROXY=none`)
- Vietnix Object Storage buckets: `khepree-public`, `khepree-private` (separate from CHAPMEE)
- SMTP credentials for `@khepree.com` mailboxes (separate from CHAPMEE)
- Google OAuth client for `account.khepree.com` (separate from CHAPMEE)
- Ed25519 license signing keys — see [LICENSE-SIGNING.md](./LICENSE-SIGNING.md)

## 1. Host layout

```bash
sudo mkdir -p /opt/khepree/app
sudo mkdir -p /etc/khepree
sudo chown deploy:deploy /opt/khepree/app
sudo chown root:deploy /etc/khepree
sudo chmod 750 /etc/khepree
```

Secrets live at `/etc/khepree/.env.production` (mode `640`, group `deploy`).

## 2. Clone / update repository

```bash
sudo -u deploy -H bash -lc '
  if [[ -d /opt/khepree/app/.git ]]; then
    cd /opt/khepree/app && git pull origin main
  else
    git clone https://github.com/trongtm97/khepree.git /opt/khepree/app
  fi
'
```

## 3. Production environment

```bash
sudo cp /opt/khepree/app/.env.production.example /etc/khepree/.env.production
sudo chmod 640 /etc/khepree/.env.production
sudo chown root:deploy /etc/khepree/.env.production
```

Edit `/etc/khepree/.env.production` — replace every `CHANGE_ME`. Minimum:

| Area | Notes |
|------|-------|
| Postgres | Unique user/password/db — not CHAPMEE values |
| Redis | Unique `REDIS_PASSWORD` |
| URLs | All `https://` — no localhost |
| S3 | Vietnix endpoint, keys, `khepree-public` / `khepree-private` |
| SMTP | `EMAIL_PROVIDER=smtp`, `MAIL_FROM`, `SMTP_*` |
| Auth | New `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://account.khepree.com` |
| Google | Production client ID/secret for account app |
| License | Ed25519 key pair from secure generation |
| SePay | Keep `SEPAY_ENV=sandbox` |
| Proxy | `TRUSTED_PROXY=none` if DNS points directly to VPS |

Validate (no secrets printed):

```bash
cd /opt/khepree/app
KHEPREE_ENV_FILE=/etc/khepree/.env.production ./scripts/integrations/verify-production-config.sh
```

## 4. Verify shared network exists

```bash
docker network inspect chapmee_chapmee_net >/dev/null
```

If missing, CHAPMEE is not running correctly — fix CHAPMEE first; do not create a conflicting network.

### DNS alias collision (chapmee.com shows Khepree)

On `chapmee_chapmee_net`, Docker Compose registers each **service name** as a network DNS alias. If Khepree services are named `web`, `account`, etc., they collide with CHAPMEE aliases (e.g. both `chapmee-web` and `khepree-web` answer as `web`). Caddy blocks that use `reverse_proxy web:3000` may then hit the wrong app.

**Fix:**

1. Khepree `compose.shared-vps.yml` — use prefixed service names (`khepree-web`, not `web`).
2. CHAPMEE Caddy — use `chapmee-web:3000`, never bare `web:3000`.
3. Recreate Khepree stack: `docker compose ... up -d --remove-orphans`.

## 5. Build or pull images

**Option A — build on VPS:**

```bash
cd /opt/khepree/app
docker compose -f compose.shared-vps.yml --env-file /etc/khepree/.env.production build
```

**Option B — CI images (recommended):** set `KHEPREE_*_IMAGE` tags in `/etc/khepree/.env.production` from GHCR SHA tags, then:

```bash
cd /opt/khepree/app
docker compose -f compose.shared-vps.yml --env-file /etc/khepree/.env.production pull
```

## 6. Migrate and start stack

Postgres must be healthy → migrate (one-shot) → apps + worker.

```bash
cd /opt/khepree/app
docker compose -f compose.shared-vps.yml --env-file /etc/khepree/.env.production up -d
```

Check status:

```bash
docker compose -f compose.shared-vps.yml --env-file /etc/khepree/.env.production ps
docker logs khepree-migrate --tail 50
docker logs khepree-worker --tail 20
```

Confirm no host ports published (only Caddy should bind 80/443):

```bash
ss -tlnp | grep -E ':80|:443|:5432|:6379|:300[0-4]'
```

## 7. Caddy (append — do not replace CHAPMEE config)

### 7.1 Backup

```bash
sudo cp /opt/chapmee/app/Caddyfile.production \
  "/opt/chapmee/app/Caddyfile.production.bak.$(date -u +%Y%m%d-%H%M%S)"
```

### 7.2 Append Khepree blocks

Copy contents of `docker/Caddyfile.shared-vps.snippet` from this repo and append to `/opt/chapmee/app/Caddyfile.production`. **Do not remove any CHAPMEE site blocks.**

### 7.3 Validate and reload (not full restart)

```bash
docker exec chapmee-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec chapmee-caddy caddy reload --config /etc/caddy/Caddyfile
```

If validation fails, restore from backup — do not reload.

## 8. DNS

Create records pointing to the VPS (same IP as CHAPMEE if shared):

| Host | Type | Value |
|------|------|-------|
| `khepree.com` | A / AAAA | VPS IP |
| `www.khepree.com` | A / AAAA | VPS IP |
| `account.khepree.com` | A / AAAA | VPS IP |
| `admin.khepree.com` | A / AAAA | VPS IP |
| `partner.khepree.com` | A / AAAA | VPS IP |
| `api.khepree.com` | A / AAAA | VPS IP |
| `cdn.khepree.com` | CNAME or A | Vietnix public bucket CDN (if used) |

Wait for propagation before TLS health checks.

## 9. Post-deploy health checks

Do not mark deploy complete until these pass:

```bash
curl -sfI https://khepree.com/vi | head -1
curl -sfI https://account.khepree.com/sign-in | head -1
curl -sfI https://admin.khepree.com | head -1
curl -sfI https://partner.khepree.com | head -1
curl -sf https://api.khepree.com/healthz
curl -sf https://api.khepree.com/readyz
```

Manual checks:

- Register / sign-in on account app
- Google login (if configured)
- Send test transactional email (SMTP)
- Upload to public bucket / signed download from private bucket
- Confirm `khepree-worker` logs show poll loop (not one-shot exit)
- Confirm rate limiting uses Redis (no MemoryRateLimiter errors in app logs)

## 10. Backups

See [DATA-SAFETY.md](./DATA-SAFETY.md). Shared VPS uses `compose.shared-vps.yml` by default:

```bash
# /etc/khepree/backup.env — BACKUP_RCLONE_REMOTE, passphrase file path
cd /opt/khepree/app
KHEPREE_ENV_FILE=/etc/khepree/.env.production ./scripts/backup/postgres-backup.sh
```

Docker volumes are **not** backups. Encrypted dumps must land off-VPS via rclone.

## 11. Rollback

**App rollback (safe):**

1. Set previous image SHAs in `/etc/khepree/.env.production` (`KHEPREE_*_IMAGE`).
2. `docker compose -f compose.shared-vps.yml --env-file /etc/khepree/.env.production up -d`
3. Re-run health checks from section 9.

**Caddy rollback:**

```bash
sudo cp /opt/chapmee/app/Caddyfile.production.bak.TIMESTAMP /opt/chapmee/app/Caddyfile.production
docker exec chapmee-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec chapmee-caddy caddy reload --config /etc/caddy/Caddyfile
```

**Database:** do **not** auto-run reverse migrations. Restore from encrypted backup if needed — see [DATA-SAFETY.md](./DATA-SAFETY.md).

## 12. Remaining manual secrets checklist

Before go-live review, confirm these are filled (not in git):

- [ ] `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
- [ ] `BETTER_AUTH_SECRET`
- [ ] `S3_*` Vietnix credentials and bucket names
- [ ] `SMTP_*` and `MAIL_FROM` / `MAIL_REPLY_TO`
- [ ] `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY`
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [ ] `SEPAY_*` (sandbox until B1)
- [ ] Backup passphrase + rclone remote
- [ ] Optional: `OUTBOX_WORKER_SECRET` if using HTTP cron trigger

## Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — dedicated VPS with bundled Caddy
- [VPS-SECURITY.md](./VPS-SECURITY.md) — host hardening
- [PRODUCTION-INTEGRATIONS.md](./PRODUCTION-INTEGRATIONS.md) — integration checklist
- [DATA-SAFETY.md](./DATA-SAFETY.md) — backup/restore
- [VPS-CICD.md](./VPS-CICD.md) — CI/CD image deploy
