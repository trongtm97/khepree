#!/usr/bin/env bash
# Create encrypted PostgreSQL backup (pg_dump custom format) and upload off-VPS.
#
# Docker volume is NOT a backup. Remote copy via rclone is the durable store.
#
# Usage:
#   ./postgres-backup.sh
#   KHEPREE_BACKUP_ENV=/etc/khepree/backup.env ./postgres-backup.sh
#
# Cron (daily as khepree user):
#   0 3 * * * cd /opt/khepree && ./scripts/backup/postgres-backup.sh >> /var/log/khepree-backup.log 2>&1

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

load_env
require_backup_prereqs

KEEP_LOCAL="${BACKUP_KEEP_LOCAL:-0}"
STAGING_DIR="${BACKUP_LOCAL_DIR}/staging"
mkdir -p "${STAGING_DIR}"
chmod 700 "${BACKUP_LOCAL_DIR}" "${STAGING_DIR}" 2>/dev/null || true

BASENAME="$(backup_basename)"
DUMP_PATH="${STAGING_DIR}/${BASENAME}"
ENCRYPTED_PATH="${STAGING_DIR}/$(encrypted_name)"

log "starting pg_dump (custom format) for database ${POSTGRES_DB}"
compose exec -T postgres pg_dump \
  -Fc \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-acl \
  > "${DUMP_PATH}"

log "encrypting ${DUMP_PATH}"
gpg --batch --yes --symmetric --cipher-algo AES256 \
  --passphrase-file "${BACKUP_PASSPHRASE_FILE}" \
  -o "${ENCRYPTED_PATH}" \
  "${DUMP_PATH}"
rm -f "${DUMP_PATH}"

upload_backup "${ENCRYPTED_PATH}"
record_backup_success

if [[ "${KEEP_LOCAL}" == "1" ]]; then
  install -m 600 "${ENCRYPTED_PATH}" "${BACKUP_LOCAL_DIR}/$(basename "${ENCRYPTED_PATH}")"
fi
rm -f "${ENCRYPTED_PATH}"

log "backup complete: $(basename "${ENCRYPTED_PATH}")"
log "running retention on remote"
"${SCRIPT_DIR}/postgres-retention.sh"
