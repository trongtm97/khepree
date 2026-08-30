#!/usr/bin/env bash
# Create /etc/khepree/ for production secrets (root-owned, restrictive permissions).
#
# Usage:
#   sudo ./04-setup-secrets-dir.sh
#   sudo ./04-setup-secrets-dir.sh /path/to/filled/.env.production
#
# Never store production .env inside the git clone.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

SECRETS_DIR="/etc/khepree"
ENV_FILE="${SECRETS_DIR}/.env.production"
SOURCE_ENV="${1:-}"

log "creating ${SECRETS_DIR}"
install -d -m 700 -o root -g root "${SECRETS_DIR}"

if [[ -n "${SOURCE_ENV}" ]]; then
  if [[ ! -f "${SOURCE_ENV}" ]]; then
    echo "error: source env file not found: ${SOURCE_ENV}" >&2
    exit 1
  fi
  log "installing env from ${SOURCE_ENV} -> ${ENV_FILE}"
  install -m 600 -o root -g root "${SOURCE_ENV}" "${ENV_FILE}"
elif [[ ! -f "${ENV_FILE}" ]]; then
  log "creating placeholder ${ENV_FILE} — fill secrets before starting stack"
  cat > "${ENV_FILE}" <<'EOF'
# Copy from .env.production.example and replace CHANGE_ME values.
# This file must not live in the git clone.
EOF
  chmod 600 "${ENV_FILE}"
  chown root:root "${ENV_FILE}"
fi

log "permissions:"
ls -ld "${SECRETS_DIR}"
ls -l "${ENV_FILE}"
log "start stack with:"
log "  docker compose -f compose.production.yml --env-file ${ENV_FILE} up -d"
