#!/usr/bin/env bash
# Post-deploy smoke checks (run on VPS or CI with network access to production URLs).

set -euo pipefail

WEB_URL="${WEB_URL:-https://khepree.com}"
ACCOUNT_URL="${ACCOUNT_URL:-https://account.khepree.com}"
ADMIN_URL="${ADMIN_URL:-https://admin.khepree.com}"
PARTNER_URL="${PARTNER_URL:-https://partner.khepree.com}"
API_URL="${API_URL:-https://api.khepree.com}"

check() {
  local name="$1"
  local url="$2"
  echo "[smoke] ${name}: ${url}"
  curl -fsS --max-time 30 "${url}" >/dev/null
}

attempt=0
until [[ "${attempt}" -ge 6 ]]; do
  attempt=$((attempt + 1))
  echo "[smoke] attempt ${attempt}/6"
  if check "marketing /vi" "${WEB_URL}/vi" \
    && check "web healthz" "${WEB_URL}/healthz" \
    && check "account sign-in" "${ACCOUNT_URL}/sign-in" \
    && check "admin sign-in" "${ADMIN_URL}/sign-in" \
    && check "partner home" "${PARTNER_URL}/" \
    && check "api readyz" "${API_URL}/readyz"; then
    echo "[smoke] all checks passed"
    exit 0
  fi
  sleep 10
done

echo "[smoke] failed after ${attempt} attempts" >&2
exit 1
