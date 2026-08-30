#!/usr/bin/env bash
# Restore a backup to a NON-PRODUCTION database for staging validation.
#
# NEVER restores over production automatically. Refuses production-looking targets.
#
# Usage:
#   ./postgres-restore.sh \
#     --backup khepree-20260830-030000.dump.gpg \
#     --target-url postgresql://user:pass@staging-db:5432/khepree_staging \
#     --confirm-not-production
#
#   ./postgres-restore.sh --latest --target-url ... --confirm-not-production
#
# After restore:
#   pnpm db:migrate   # if dump predates latest migration
#   run smoke tests (see docs/DATA-SAFETY.md)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

load_env
command -v gpg >/dev/null || die "gpg not found"
command -v pg_restore >/dev/null || die "pg_restore not found (install postgresql-client)"
[[ -n "${BACKUP_RCLONE_REMOTE}" ]] || die "BACKUP_RCLONE_REMOTE not set"

BACKUP_FILE=""
TARGET_URL=""
USE_LATEST=0
CONFIRMED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup) BACKUP_FILE="$2"; shift 2 ;;
    --latest) USE_LATEST=1; shift ;;
    --target-url) TARGET_URL="$2"; shift 2 ;;
    --confirm-not-production) CONFIRMED=1; shift ;;
    *) die "unknown argument: $1" ;;
  esac
done

[[ "${CONFIRMED}" -eq 1 ]] || die "refusing restore without --confirm-not-production"
[[ -n "${TARGET_URL}" ]] || die "--target-url is required"
is_production_db_url "${TARGET_URL}" && die "target URL looks like production — use an empty staging database"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "${WORKDIR}"' EXIT

if [[ "${USE_LATEST}" -eq 1 ]]; then
  BACKUP_FILE="$(rclone lsf "${BACKUP_RCLONE_REMOTE}" --files-only | grep -E "^${BACKUP_FILENAME_PREFIX}-[0-9]{8}-[0-9]{6}\.dump\.gpg$" | sort | tail -n 1)"
  [[ -n "${BACKUP_FILE}" ]] || die "no remote backups found"
fi

[[ -n "${BACKUP_FILE}" ]] || die "--backup or --latest required"

REMOTE_PATH="${BACKUP_RCLONE_REMOTE}/${BACKUP_FILE}"
LOCAL_ENCRYPTED="${WORKDIR}/${BACKUP_FILE}"
LOCAL_DUMP="${WORKDIR}/${BACKUP_FILE%.gpg}"

log "downloading ${REMOTE_PATH}"
rclone copyto "${REMOTE_PATH}" "${LOCAL_ENCRYPTED}"

log "decrypting"
gpg --batch --decrypt \
  --passphrase-file "${BACKUP_PASSPHRASE_FILE}" \
  -o "${LOCAL_DUMP}" \
  "${LOCAL_ENCRYPTED}"

log "restoring to staging target (pg_restore --clean --if-exists)"
pg_restore \
  --dbname="${TARGET_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "${LOCAL_DUMP}"

log "restore finished from ${BACKUP_FILE}"
log "next steps:"
log "  1. cd ${REPO_ROOT} && DATABASE_URL='${TARGET_URL}' pnpm db:migrate"
log "  2. run smoke tests (docs/DATA-SAFETY.md#restore-drill)"
log "  3. do NOT point production apps at this database"
