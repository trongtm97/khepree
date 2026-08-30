#!/usr/bin/env bash
# Validate production integration config shape — never prints secret values.
#
# Usage:
#   ./verify-production-config.sh
#   KHEPREE_ENV_FILE=/etc/khepree/.env.production ./verify-production-config.sh
#
# Exit 0 = all checks pass. Exit 1 = one or more failures.

set -euo pipefail

ENV_FILE="${KHEPREE_ENV_FILE:-/etc/khepree/.env.production}"
FAIL=0

warn() { echo "[verify-config] FAIL: $*" >&2; FAIL=1; }
ok() { echo "[verify-config] OK: $*"; }

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[verify-config] error: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

check_url() {
  local name="$1"
  local value="$2"
  local expected_host="$3"
  if [[ -z "${value}" || "${value}" == *"CHANGE_ME"* ]]; then
    warn "${name} missing or placeholder"
    return
  fi
  if [[ "${value}" != "https://${expected_host}" && "${value}" != "https://${expected_host}/" ]]; then
    warn "${name} should be https://${expected_host} (got host mismatch — value not printed)"
    return
  fi
  ok "${name}"
}

check_set() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" || "${value}" == *"CHANGE_ME"* ]]; then
    warn "${name} missing or placeholder"
  else
    ok "${name} is set"
  fi
}

echo "[verify-config] checking ${ENV_FILE}"

check_url WEB_URL "${WEB_URL:-}" "khepree.com"
check_url APP_URL "${APP_URL:-}" "khepree.com"
check_url ACCOUNT_URL "${ACCOUNT_URL:-}" "account.khepree.com"
check_url ADMIN_URL "${ADMIN_URL:-}" "admin.khepree.com"
check_url PARTNER_URL "${PARTNER_URL:-}" "partner.khepree.com"
check_url API_URL "${API_URL:-}" "api.khepree.com"
check_url BETTER_AUTH_URL "${BETTER_AUTH_URL:-}" "account.khepree.com"

check_url NEXT_PUBLIC_WEB_URL "${NEXT_PUBLIC_WEB_URL:-}" "khepree.com"
check_url NEXT_PUBLIC_ACCOUNT_URL "${NEXT_PUBLIC_ACCOUNT_URL:-}" "account.khepree.com"
check_url NEXT_PUBLIC_ADMIN_URL "${NEXT_PUBLIC_ADMIN_URL:-}" "admin.khepree.com"
check_url NEXT_PUBLIC_PARTNER_URL "${NEXT_PUBLIC_PARTNER_URL:-}" "partner.khepree.com"

check_set BETTER_AUTH_SECRET
check_set POSTGRES_USER
check_set POSTGRES_PASSWORD
check_set POSTGRES_DB
check_set REDIS_PASSWORD
check_set R2_ACCOUNT_ID
check_set R2_ACCESS_KEY_ID
check_set R2_SECRET_ACCESS_KEY
check_set R2_BUCKET_PUBLIC
check_set R2_BUCKET_PRIVATE
check_set LICENSE_SIGNING_PRIVATE_KEY
check_set LICENSE_SIGNING_PUBLIC_KEY
check_set EMAIL_PROVIDER_API_KEY

if [[ "${EMAIL_PROVIDER:-}" != "resend" ]]; then
  warn "EMAIL_PROVIDER must be resend in production"
else
  ok "EMAIL_PROVIDER=resend"
fi

if [[ "${PAYMENT_PROVIDER:-}" != "sepay" ]]; then
  warn "PAYMENT_PROVIDER must be sepay"
else
  ok "PAYMENT_PROVIDER=sepay"
fi

if [[ "${SEPAY_ENV:-}" == "production" && "${KHEPREE_ALLOW_SEPAY_PRODUCTION:-}" != "1" ]]; then
  warn "SEPAY_ENV=production requires manual go-live — set KHEPREE_ALLOW_SEPAY_PRODUCTION=1 to acknowledge"
elif [[ "${SEPAY_ENV:-}" == "sandbox" ]]; then
  ok "SEPAY_ENV=sandbox (expected until B1 gate)"
elif [[ "${SEPAY_ENV:-}" == "production" ]]; then
  ok "SEPAY_ENV=production (manual go-live acknowledged)"
else
  warn "SEPAY_ENV must be sandbox or production"
fi

if [[ -z "${REDIS_PASSWORD:-}" || "${REDIS_PASSWORD}" == *"CHANGE_ME"* ]]; then
  warn "REDIS_PASSWORD missing (REDIS_URL is composed in compose.production.yml)"
else
  ok "REDIS_PASSWORD is set"
fi

if [[ "${TRUSTED_PROXY:-}" == "cloudflare" ]]; then
  ok "TRUSTED_PROXY=cloudflare"
elif [[ -z "${TRUSTED_PROXY:-}" || "${TRUSTED_PROXY}" == "none" ]]; then
  ok "TRUSTED_PROXY not cloudflare (ensure DNS is not proxied or IP spoofing is understood)"
else
  warn "TRUSTED_PROXY has unexpected value"
fi

if [[ -n "${GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  if [[ "${GOOGLE_CLIENT_ID}" == *"CHANGE_ME"* || "${GOOGLE_CLIENT_SECRET}" == *"CHANGE_ME"* ]]; then
    warn "Google OAuth placeholders must be removed or vars unset"
  else
    ok "Google OAuth configured (verify redirect URIs in Google Console)"
  fi
else
  ok "Google OAuth not configured (optional)"
fi

if [[ -n "${OUTBOX_WORKER_SECRET:-}" && "${OUTBOX_WORKER_SECRET}" != *"CHANGE_ME"* ]]; then
  ok "OUTBOX_WORKER_SECRET is set (HTTP outbox endpoint)"
else
  ok "OUTBOX_WORKER_SECRET unset or placeholder (OK if using dedicated worker container only)"
fi

if [[ "${FAIL}" -ne 0 ]]; then
  echo "[verify-config] completed with failures" >&2
  exit 1
fi

echo "[verify-config] all checks passed"
exit 0
