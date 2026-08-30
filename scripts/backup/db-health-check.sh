#!/usr/bin/env bash
# Simple PostgreSQL + backup health checks for cron/monitoring.
#
# Usage:
#   ./db-health-check.sh
#   ./db-health-check.sh --json
#
# Exit codes:
#   0 = all checks OK
#   1 = warning threshold exceeded
#   2 = critical threshold exceeded

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

load_env

JSON=0
[[ "${1:-}" == "--json" ]] && JSON=1

MAX_CONNECTIONS_WARN="${DB_MAX_CONNECTIONS_WARN:-40}"
MAX_CONNECTIONS_CRIT="${DB_MAX_CONNECTIONS_CRIT:-80}"
DISK_USAGE_WARN_PCT="${DB_DISK_USAGE_WARN_PCT:-75}"
DISK_USAGE_CRIT_PCT="${DB_DISK_USAGE_CRIT_PCT:-90}"
BACKUP_AGE_WARN_HOURS="${BACKUP_AGE_WARN_HOURS:-30}"
BACKUP_AGE_CRIT_HOURS="${BACKUP_AGE_CRIT_HOURS:-50}"

STATUS=0
set_status() {
  local level="$1"
  if [[ "${level}" == "crit" && "${STATUS}" -lt 2 ]]; then STATUS=2; fi
  if [[ "${level}" == "warn" && "${STATUS}" -lt 1 ]]; then STATUS=1; fi
}

CONNECTIONS="$(compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Atqc "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();")"
DISK_BYTES="$(compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Atqc "SELECT pg_database_size(current_database());")"
DISK_HUMAN="$(compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Atqc "SELECT pg_size_pretty(pg_database_size(current_database()));")"

# Host disk for postgres volume (approximate — checks root fs on postgres container)
DISK_USE_PCT="$(compose exec -T postgres sh -c "df /var/lib/postgresql/data 2>/dev/null | tail -1 | awk '{print \$5}' | tr -d '%'" || echo "0")"

BACKUP_AGE="$(backup_age_hours)"
BACKUP_LAST="$(cat "${BACKUP_LAST_SUCCESS_FILE}" 2>/dev/null || echo "never")"

CONN_LEVEL="ok"
[[ "${CONNECTIONS}" -ge "${MAX_CONNECTIONS_CRIT}" ]] && CONN_LEVEL="crit" && set_status crit
[[ "${CONNECTIONS}" -ge "${MAX_CONNECTIONS_WARN}" && "${CONN_LEVEL}" == "ok" ]] && CONN_LEVEL="warn" && set_status warn

DISK_LEVEL="ok"
[[ "${DISK_USE_PCT}" -ge "${DISK_USAGE_CRIT_PCT}" ]] && DISK_LEVEL="crit" && set_status crit
[[ "${DISK_USE_PCT}" -ge "${DISK_USAGE_WARN_PCT}" && "${DISK_LEVEL}" == "ok" ]] && DISK_LEVEL="warn" && set_status warn

BACKUP_LEVEL="ok"
[[ "${BACKUP_AGE}" -ge "${BACKUP_AGE_CRIT_HOURS}" ]] && BACKUP_LEVEL="crit" && set_status crit
[[ "${BACKUP_AGE}" -ge "${BACKUP_AGE_WARN_HOURS}" && "${BACKUP_LEVEL}" == "ok" ]] && BACKUP_LEVEL="warn" && set_status warn

if [[ "${JSON}" -eq 1 ]]; then
  cat <<EOF
{
  "connections": ${CONNECTIONS},
  "connections_level": "${CONN_LEVEL}",
  "database_size_bytes": ${DISK_BYTES},
  "database_size_pretty": "${DISK_HUMAN}",
  "volume_disk_use_percent": ${DISK_USE_PCT},
  "disk_level": "${DISK_LEVEL}",
  "backup_age_hours": ${BACKUP_AGE},
  "backup_last_success_utc": "${BACKUP_LAST}",
  "backup_level": "${BACKUP_LEVEL}",
  "overall_status": $([[ "${STATUS}" -eq 0 ]] && echo "\"ok\"" || ([[ "${STATUS}" -eq 1 ]] && echo "\"warn\"" || echo "\"crit\""))
}
EOF
else
  log "connections: ${CONNECTIONS} (${CONN_LEVEL}, warn>=${MAX_CONNECTIONS_WARN}, crit>=${MAX_CONNECTIONS_CRIT})"
  log "database size: ${DISK_HUMAN} (${DISK_BYTES} bytes)"
  log "postgres volume disk use: ${DISK_USE_PCT}% (${DISK_LEVEL})"
  log "backup age: ${BACKUP_AGE}h, last success: ${BACKUP_LAST} (${BACKUP_LEVEL})"
fi

if [[ "${BACKUP_LEVEL}" == "crit" ]]; then
  echo '{"timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'","level":"error","service":"alerts","event":"alert.backup_stale","backupAgeHours":'"${BACKUP_AGE}"',"backupLastSuccessUtc":"'"${BACKUP_LAST}"'"}'
fi

exit "${STATUS}"
