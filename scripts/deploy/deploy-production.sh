#!/usr/bin/env bash
# Production deploy on the VPS. Invoked by GitHub Actions over SSH.
#
# Required env:
#   GIT_SHA              — image tag (commit SHA)
#   GHCR_IMAGE_PREFIX    — e.g. ghcr.io/myorg/khepree
#   KHEPREE_REPO         — git clone path (default /opt/khepree)
#   KHEPREE_ENV_FILE     — default /etc/khepree/.env.production
#
# Optional:
#   GHCR_TOKEN           — short-lived registry login (not persisted)
#   GHCR_USER            — default github
#   DEPLOY_OPERATOR      — default github-actions
#   WORKFLOW_RUN_ID      — GitHub Actions run id

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
KHEPREE_REPO="${KHEPREE_REPO:-/opt/khepree}"
KHEPREE_ENV_FILE="${KHEPREE_ENV_FILE:-/etc/khepree/.env.production}"
STATE_DIR="/etc/khepree"
STATE_FILE="${STATE_DIR}/deploy-state.json"
PREVIOUS_IMAGES="${STATE_DIR}/previous-images.env"
DEPLOY_LOG="${STATE_DIR}/deploy.log"
COMPOSE_FILE="${KHEPREE_REPO}/compose.production.yml"
GIT_SHA="${GIT_SHA:?GIT_SHA required}"
GHCR_IMAGE_PREFIX="${GHCR_IMAGE_PREFIX:?GHCR_IMAGE_PREFIX required}"
DEPLOY_OPERATOR="${DEPLOY_OPERATOR:-github-actions}"
WORKFLOW_RUN_ID="${WORKFLOW_RUN_ID:-manual}"

log() { echo "[khepree-deploy] $*"; }

mkdir -p "${STATE_DIR}"
touch "${DEPLOY_LOG}"
chmod 600 "${DEPLOY_LOG}" 2>/dev/null || true

if [[ ! -f "${KHEPREE_ENV_FILE}" ]]; then
  log "error: missing ${KHEPREE_ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
source "${KHEPREE_ENV_FILE}"

PREV_SHA=""
if [[ -f "${STATE_FILE}" ]]; then
  PREV_SHA="$(python3 -c "import json; print(json.load(open('${STATE_FILE}')).get('commit_sha',''))" 2>/dev/null || true)"
fi

save_current_images() {
  if [[ -f "${STATE_DIR}/current-images.env" ]]; then
    cp "${STATE_DIR}/current-images.env" "${PREVIOUS_IMAGES}"
  fi
}

write_image_env() {
  local tag="$1"
  local file="$2"
  cat > "${file}" <<EOF
KHEPREE_WEB_IMAGE=${GHCR_IMAGE_PREFIX}-web:${tag}
KHEPREE_ACCOUNT_IMAGE=${GHCR_IMAGE_PREFIX}-account:${tag}
KHEPREE_ADMIN_IMAGE=${GHCR_IMAGE_PREFIX}-admin:${tag}
KHEPREE_PARTNER_IMAGE=${GHCR_IMAGE_PREFIX}-partner:${tag}
KHEPREE_API_IMAGE=${GHCR_IMAGE_PREFIX}-api:${tag}
KHEPREE_WORKER_IMAGE=${GHCR_IMAGE_PREFIX}-outbox-worker:${tag}
KHEPREE_MIGRATE_IMAGE=${GHCR_IMAGE_PREFIX}-migrate:${tag}
EOF
  chmod 600 "${file}"
}

migration_head() {
  python3 - <<'PY' "${KHEPREE_REPO}"
import json, sys
from pathlib import Path
journal = Path(sys.argv[1]) / "packages/db/drizzle/meta/_journal.json"
data = json.loads(journal.read_text(encoding="utf-8"))
tags = [e.get("tag", "") for e in data.get("entries", [])]
print(tags[-1] if tags else "unknown")
PY
}

migrations_changed() {
  local prev="$1" new="$2"
  [[ -z "${prev}" ]] && return 0
  cd "${KHEPREE_REPO}"
  git diff "${prev}" "${new}" -- packages/db/drizzle/ packages/db/src/schema/ | grep -q .
}

rollback_images() {
  log "rolling back to previous image tags (database migrations are NOT reversed)"
  if [[ ! -f "${PREVIOUS_IMAGES}" ]]; then
    log "error: no ${PREVIOUS_IMAGES} — cannot rollback"
    return 1
  fi
  # shellcheck disable=SC1090
  set -a
  source "${PREVIOUS_IMAGES}"
  set +a
  docker compose -f "${COMPOSE_FILE}" --env-file "${KHEPREE_ENV_FILE}" up -d --remove-orphans
}

cd "${KHEPREE_REPO}"
git fetch --all --prune
git checkout -f "${GIT_SHA}"

save_current_images
write_image_env "${GIT_SHA}" "${STATE_DIR}/current-images.env"

# shellcheck disable=SC1090
set -a
source "${STATE_DIR}/current-images.env"
set +a

if migrations_changed "${PREV_SHA}" "${GIT_SHA}"; then
  log "schema/migration changes detected — requiring fresh backup"
  "${KHEPREE_REPO}/scripts/backup/pre-migrate-backup.sh" --require
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

log "pulling images for ${GIT_SHA}"
docker compose -f "${COMPOSE_FILE}" --env-file "${KHEPREE_ENV_FILE}" pull \
  migrate web account admin partner api worker

log "running migrations"
docker compose -f "${COMPOSE_FILE}" --env-file "${KHEPREE_ENV_FILE}" up migrate --abort-on-container-exit

log "starting runtime services"
docker compose -f "${COMPOSE_FILE}" --env-file "${KHEPREE_ENV_FILE}" up -d --remove-orphans

log "running smoke tests"
if ! "${SCRIPT_DIR}/smoke-production.sh"; then
  log "smoke tests failed — rolling back application images"
  rollback_images || true
  echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") FAIL sha=${GIT_SHA} operator=${DEPLOY_OPERATOR} run=${WORKFLOW_RUN_ID}" >> "${DEPLOY_LOG}"
  exit 1
fi

MIG_HEAD="$(migration_head)"
DEPLOYED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
python3 - <<PY
import json
from pathlib import Path
state = {
    "commit_sha": "${GIT_SHA}",
    "deployed_at": "${DEPLOYED_AT}",
    "migration_head": "${MIG_HEAD}",
    "operator": "${DEPLOY_OPERATOR}",
    "workflow_run_id": "${WORKFLOW_RUN_ID}",
    "images": {
        "web": "${KHEPREE_WEB_IMAGE}",
        "account": "${KHEPREE_ACCOUNT_IMAGE}",
        "admin": "${KHEPREE_ADMIN_IMAGE}",
        "partner": "${KHEPREE_PARTNER_IMAGE}",
        "api": "${KHEPREE_API_IMAGE}",
        "worker": "${KHEPREE_WORKER_IMAGE}",
        "migrate": "${KHEPREE_MIGRATE_IMAGE}",
    },
}
Path("${STATE_FILE}").write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
PY
chmod 600 "${STATE_FILE}"

echo "${DEPLOYED_AT} OK sha=${GIT_SHA} migration=${MIG_HEAD} operator=${DEPLOY_OPERATOR} run=${WORKFLOW_RUN_ID}" >> "${DEPLOY_LOG}"
log "deploy complete: ${GIT_SHA} (migration head ${MIG_HEAD})"
