#!/usr/bin/env bash
# Harden SSH: key-only auth, disable root login.
#
# DANGER: run ONLY after verifying key login for the deploy user in a separate session.
#
# Usage:
#   sudo ./07-harden-ssh.sh --confirm-key-login
#
# Without --confirm-key-login this script exits without changes.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

USER_NAME="$(deploy_user)"
USER_HOME="$(deploy_home)"
AUTH_KEYS="${USER_HOME}/.ssh/authorized_keys"
DROP_IN="/etc/ssh/sshd_config.d/99-khepree-hardening.conf"

if [[ "${1:-}" != "--confirm-key-login" ]]; then
  cat >&2 <<EOF
error: refusing to change SSH without --confirm-key-login

Before running this script:
  1. Run 01-create-deploy-user.sh and install your public key.
  2. Open a NEW terminal and verify: ssh ${USER_NAME}@<server-ip>
  3. Verify sudo works: sudo -u ${USER_NAME} sudo -n true  (or login as ${USER_NAME} and run sudo whoami)
  4. Keep this root session open as a fallback.
  5. Re-run: sudo $0 --confirm-key-login
EOF
  exit 1
fi

if ! id "${USER_NAME}" &>/dev/null; then
  echo "error: deploy user ${USER_NAME} does not exist" >&2
  exit 1
fi

if [[ ! -s "${AUTH_KEYS}" ]]; then
  echo "error: ${AUTH_KEYS} is missing or empty — add a key before hardening" >&2
  exit 1
fi

log "writing ${DROP_IN}"
cat > "${DROP_IN}" <<'EOF'
# Khepree VPS hardening — key auth only, no root SSH.
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AuthenticationMethods publickey
EOF
chmod 644 "${DROP_IN}"

if ! sshd -t; then
  echo "error: sshd config test failed — removing drop-in" >&2
  rm -f "${DROP_IN}"
  exit 1
fi

if confirm "Apply SSH hardening and restart sshd? Keep this session open."; then
  systemctl restart ssh || systemctl restart sshd
  log "sshd restarted. test key login in a NEW terminal before closing this session."
else
  log "aborted — drop-in written but sshd not restarted"
fi
