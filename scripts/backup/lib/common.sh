#!/usr/bin/env bash
# Shared helpers for Khepree backup scripts.

set -euo pipefail

BACKUP_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT_DIR="$(cd "${BACKUP_LIB_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKUP_SCRIPT_DIR}/.." && pwd)"

KHEPREE_ENV_FILE="${KHEPREE_ENV_FILE:-/etc/khepree/.env.production}"
KHEPREE_BACKUP_ENV="${KHEPREE_BACKUP_ENV:-/etc/khepree/backup.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/compose.production.yml}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/khepree/postgres}"
BACKUP_PASSPHRASE_FILE="${BACKUP_PASSPHRASE_FILE:-/etc/khepree/backup.passphrase}"
BACKUP_LAST_SUCCESS_FILE="${BACKUP_LAST_SUCCESS_FILE:-/var/backups/khepree/last-backup.timestamp}"
BACKUP_RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-7}"
BACKUP_RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-4}"
BACKUP_RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-3}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"
BACKUP_FILENAME_PREFIX="${BACKUP_FILENAME_PREFIX:-khepree}"

# Hostnames that must never be restore targets without explicit override.
PRODUCTION_DB_HOST_MARKERS="${PRODUCTION_DB_HOST_MARKERS:-postgres}"

log() {
  echo "[khepree-backup] $*"
}

die() {
  echo "[khepree-backup] error: $*" >&2
  exit 1
}

load_env() {
  if [[ -f "${KHEPREE_ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${KHEPREE_ENV_FILE}"
    set +a
  fi
  if [[ -f "${KHEPREE_BACKUP_ENV}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${KHEPREE_BACKUP_ENV}"
    set +a
  fi
}

require_backup_prereqs() {
  command -v docker >/dev/null || die "docker not found"
  command -v gpg >/dev/null || die "gpg not found"
  [[ -f "${COMPOSE_FILE}" ]] || die "compose file not found: ${COMPOSE_FILE}"
  [[ -f "${BACKUP_PASSPHRASE_FILE}" ]] || die "missing ${BACKUP_PASSPHRASE_FILE} — see docs/DATA-SAFETY.md"
  [[ -n "${BACKUP_RCLONE_REMOTE}" ]] || die "BACKUP_RCLONE_REMOTE not set — backups must upload off-VPS"
  [[ -n "${POSTGRES_USER:-}" && -n "${POSTGRES_DB:-}" ]] || die "POSTGRES_USER and POSTGRES_DB required in ${KHEPREE_ENV_FILE}"
}

compose() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${KHEPREE_ENV_FILE}" "$@"
}

backup_timestamp() {
  date -u +"%Y%m%d-%H%M%S"
}

backup_basename() {
  echo "${BACKUP_FILENAME_PREFIX}-$(backup_timestamp).dump"
}

encrypted_name() {
  echo "$(backup_basename).gpg"
}

record_backup_success() {
  install -d -m 700 "$(dirname "${BACKUP_LAST_SUCCESS_FILE}")"
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "${BACKUP_LAST_SUCCESS_FILE}"
}

backup_age_hours() {
  if [[ ! -f "${BACKUP_LAST_SUCCESS_FILE}" ]]; then
    echo "999999"
    return
  fi
  local last_epoch now_epoch
  last_epoch="$(date -d "$(cat "${BACKUP_LAST_SUCCESS_FILE}")" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$(cat "${BACKUP_LAST_SUCCESS_FILE}")" +%s 2>/dev/null || echo 0)"
  now_epoch="$(date -u +%s)"
  if [[ "${last_epoch}" -eq 0 ]]; then
    echo "999999"
    return
  fi
  echo $(( (now_epoch - last_epoch) / 3600 ))
}

upload_backup() {
  local file="$1"
  log "uploading to ${BACKUP_RCLONE_REMOTE}"
  rclone copyto "${file}" "${BACKUP_RCLONE_REMOTE}/$(basename "${file}")"
}

is_production_db_url() {
  local url="$1"
  local marker
  for marker in ${PRODUCTION_DB_HOST_MARKERS}; do
    if [[ "${url}" == *"@${marker}"* ]] || [[ "${url}" == *"@${marker}:"* ]] || [[ "${url}" == *"//${marker}"* ]] || [[ "${url}" == *"//${marker}:"* ]]; then
      return 0
    fi
  done
  if [[ -n "${PRODUCTION_DATABASE_URL:-}" && "${url}" == "${PRODUCTION_DATABASE_URL}" ]]; then
    return 0
  fi
  return 1
}
