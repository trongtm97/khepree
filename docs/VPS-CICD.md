# VPS CI/CD

Automated path: **push to `main`** → quality → integration → GHCR images (git SHA tag) → SSH deploy to production VPS.

Workflow: `.github/workflows/production.yml`

Related: `docs/VPS-SECURITY.md`, `docs/DATA-SAFETY.md`, `docs/OBSERVABILITY.md`, `compose.production.yml`.

## Pipeline stages

| Stage | Job | Blocks deploy on failure |
|-------|-----|--------------------------|
| 1 | `quality` — lint, typecheck, test, build | Yes |
| 2 | `integration` — Postgres migrate + `INTEGRATION=1` tests | Yes |
| 3 | `docker-build` — build/push GHCR images tagged with **git SHA** | Yes |
| 4 | `deploy-production` — SSH to VPS, pull SHA, migrate, smoke | Yes (rolls back images) |

PRs run `ci.yml` + `docker.yml` (smoke build only) — **no deploy**.

## Concurrency

```yaml
concurrency:
  group: production-deploy
  cancel-in-progress: false
```

Only one production deploy runs at a time. New pushes queue; they do not cancel an in-flight deploy.

## GHCR images

Registry: `ghcr.io/<owner>/khepree-<service>:<git-sha>`

| Image | Service |
|-------|---------|
| `khepree-web` | Marketing |
| `khepree-account` | Account |
| `khepree-admin` | Admin |
| `khepree-partner` | Partner |
| `khepree-api` | API |
| `khepree-outbox-worker` | Outbox worker |
| `khepree-migrate` | DB migrations |

**Do not deploy `:latest`.** Every deploy pins an immutable SHA tag.

On git tag `v*` push, images also receive the semver tag (e.g. `v1.2.3`) in addition to SHA.

## GitHub Environment: `production`

Create in repo **Settings → Environments → production**.

### Required secrets (GitHub)

| Secret | Purpose |
|--------|---------|
| `VPS_HOST` | Production VPS hostname or IP |
| `VPS_USER` | SSH user (e.g. `khepree`) |
| `VPS_SSH_KEY` | Private key for deploy (ed25519 recommended) |

### Optional secrets

| Secret | Purpose |
|--------|---------|
| `GHCR_PULL_TOKEN` | PAT/`GITHUB_TOKEN` with `read:packages` for VPS `docker pull` (defaults to workflow token if unset) |

### What stays on the VPS (not in GitHub)

All application secrets: `/etc/khepree/.env.production` — database, auth, R2, SePay, Resend, license keys, etc.

## VPS prerequisites

1. Hardened host (`docs/VPS-SECURITY.md`)
2. Git clone at `/opt/khepree` (deploy user can `git fetch`)
3. `/etc/khepree/.env.production` configured
4. `docker compose` production stack previously bootstrapped (Postgres volume exists)
5. Deploy user in `docker` group
6. GHCR read access (`docker login ghcr.io` — token passed per deploy from Actions)

## Deploy flow (on VPS)

`scripts/deploy/deploy-production.sh`:

1. Save current image tags → `/etc/khepree/previous-images.env` (rollback)
2. `git checkout` deploy SHA
3. Write `/etc/khepree/current-images.env` with GHCR tags
4. If `packages/db/drizzle/` or schema changed since last deploy → `pre-migrate-backup.sh --require`
5. `docker compose pull` (migrate + apps + worker)
6. `docker compose up migrate` (one-shot)
7. `docker compose up -d`
8. `scripts/deploy/smoke-production.sh`
9. On smoke failure → **rollback previous image tags** (DB migrations are **not** auto-reversed)
10. Record deploy state + append log

## Smoke tests

`scripts/deploy/smoke-production.sh`:

- `https://khepree.com/vi`
- `https://khepree.com/healthz`
- `https://account.khepree.com/sign-in`
- `https://admin.khepree.com/sign-in`
- `https://partner.khepree.com/`
- `https://api.khepree.com/readyz`

## Deploy log and state

| File | Content |
|------|---------|
| `/etc/khepree/deploy-state.json` | Last successful deploy: SHA, time, migration head, operator, image tags |
| `/etc/khepree/deploy.log` | Append-only history |
| `/etc/khepree/previous-images.env` | Rollback image tags |
| `/etc/khepree/current-images.env` | Active image tags |

Example log line:

```
2026-08-30T12:00:00Z OK sha=abc1234 migration=0013_phase16_url_redirects operator=github-actions run=12345
```

## Manual deploy

```bash
# On VPS as khepree
export GIT_SHA=abc1234
export GHCR_IMAGE_PREFIX=ghcr.io/myorg/khepree
export DEPLOY_OPERATOR=manual
bash /opt/khepree/scripts/deploy/deploy-production.sh
```

Or trigger **Actions → Production → Run workflow** with optional `git_sha`.

## Rollback (manual)

```bash
source /etc/khepree/previous-images.env
docker compose -f /opt/khepree/compose.production.yml \
  --env-file /etc/khepree/.env.production up -d --remove-orphans
```

Database schema is **not** rolled back automatically. Restore from backup if migration caused data issues (`docs/DATA-SAFETY.md`).

## Failure policy

| Failure | Action |
|---------|--------|
| Quality / integration / docker-build | No deploy |
| Smoke after deploy | Revert to `previous-images.env` |
| Migration mid-deploy | Investigate; may need backup restore — no auto DB down-migrate |

## First-time setup checklist

- [ ] Create GitHub `production` environment + secrets
- [ ] Bootstrap VPS stack once manually (`compose.production.yml`)
- [ ] Ensure GHCR packages are readable from VPS (org package settings + token)
- [ ] Push to `main` and verify Actions pipeline green end-to-end
