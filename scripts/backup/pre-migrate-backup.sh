#!/usr/bin/env bash
# Verify or create a recent backup before a deployment that includes DB migrations.
#
# App-only deploys (no schema change) do not need this — run manually for migration releases.
#
# Usage:
#   ./pre-migrate-backup.sh              # warn if backup stale, create if missing
#   ./pre-migrate-backup.sh --require    # exit 1 if backup cannot be verified/created
#
# Suggested before risky deploy:
#   ./scripts/backup/pre-migrate-backup.sh --require && \
#   docker compose -f compose.production.yml --env-file /etc/khepree/.env.production up -d

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

load_env

REQUIRE=0
if [[ "${1:-}" == "--require" ]]; then
  REQUIRE=1
fi

AGE="$(backup_age_hours)"
log "last successful backup age: ${AGE} hour(s) (max ${BACKUP_MAX_AGE_HOURS})"

if [[ "${AGE}" -le "${BACKUP_MAX_AGE_HOURS}" ]]; then
  log "recent backup exists — OK for migration deploy"
  exit 0
fi

log "backup is stale or missing — creating new backup"
if ! "${SCRIPT_DIR}/postgres-backup.sh"; then
  if [[ "${REQUIRE}" -eq 1 ]]; then
    die "backup failed — blocking migration deploy"
  fi
  log "warning: backup failed (non-blocking mode)"
  exit 1
fi

log "fresh backup created — OK for migration deploy"
