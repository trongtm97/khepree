#!/usr/bin/env bash
# Create the non-root deployment user (default: khepree) with sudo access.
#
# Run on a fresh Ubuntu 24.04 VPS as root BEFORE disabling root SSH.
#
# Usage:
#   sudo ./01-create-deploy-user.sh
#   sudo KHEPREE_SSH_PUBKEY_FILE=~/.ssh/id_ed25519.pub ./01-create-deploy-user.sh
#
# Does NOT disable password or root SSH login.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root
require_ubuntu_2404

USER_NAME="$(deploy_user)"
USER_HOME="$(deploy_home)"
PUBKEY_FILE="${KHEPREE_SSH_PUBKEY_FILE:-/root/.ssh/authorized_keys}"

if id "${USER_NAME}" &>/dev/null; then
  log "user ${USER_NAME} already exists"
else
  log "creating user ${USER_NAME}"
  useradd -m -s /bin/bash "${USER_NAME}"
  usermod -aG sudo "${USER_NAME}"
  passwd -l "${USER_NAME}" >/dev/null 2>&1 || true
fi

install -d -m 700 -o "${USER_NAME}" -g "${USER_NAME}" "${USER_HOME}/.ssh"

if [[ -f "${PUBKEY_FILE}" ]]; then
  log "installing SSH public key from ${PUBKEY_FILE}"
  install -m 600 -o "${USER_NAME}" -g "${USER_NAME}" /dev/null "${USER_HOME}/.ssh/authorized_keys"
  grep -v '^[[:space:]]*$' "${PUBKEY_FILE}" >> "${USER_HOME}/.ssh/authorized_keys"
  sort -u -o "${USER_HOME}/.ssh/authorized_keys" "${USER_HOME}/.ssh/authorized_keys"
  chmod 600 "${USER_HOME}/.ssh/authorized_keys"
else
  log "warning: no pubkey at ${PUBKEY_FILE} — add one before hardening SSH"
fi

SUDOERS="/etc/sudoers.d/${USER_NAME}"
if [[ ! -f "${SUDOERS}" ]]; then
  log "granting passwordless sudo for docker compose operations"
  cat > "${SUDOERS}" <<EOF
# Khepree deploy user — adjust if your policy requires a password for sudo.
${USER_NAME} ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker compose, /usr/bin/systemctl
EOF
  chmod 440 "${SUDOERS}"
fi

log "done. verify key login in a NEW terminal before running 07-harden-ssh.sh:"
log "  ssh ${USER_NAME}@<server-ip>"
