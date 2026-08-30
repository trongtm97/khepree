# Shared env for Docker image smoke tests (not production secrets).
export SMOKE_DATABASE_URL="${SMOKE_DATABASE_URL:-postgresql://khepree:khepree_local@127.0.0.1:5432/khepree_local}"
export SMOKE_ENV=(
  -e NODE_ENV=production
  -e DATABASE_URL="${SMOKE_DATABASE_URL}"
  -e BETTER_AUTH_SECRET=ci-docker-secret-minimum-32-characters-long
  -e BETTER_AUTH_URL=http://localhost:3001
  -e WEB_URL=http://localhost:3000
  -e ACCOUNT_URL=http://localhost:3001
  -e ADMIN_URL=http://localhost:3002
  -e PARTNER_URL=http://localhost:3003
  -e API_URL=http://localhost:3004
  -e REDIS_URL=redis://127.0.0.1:6379
  -e R2_ACCOUNT_ID=smoke
  -e R2_ACCESS_KEY_ID=smoke
  -e R2_SECRET_ACCESS_KEY=smoke
  -e R2_BUCKET_PUBLIC=smoke-public
  -e R2_BUCKET_PRIVATE=smoke-private
  -e LICENSE_SIGNING_PRIVATE_KEY=smoke-private-key
  -e LICENSE_SIGNING_PUBLIC_KEY=smoke-public-key
  -e EMAIL_FROM="Khepree <no-reply@khepree.com>"
  -e EMAIL_PROVIDER=resend
  -e EMAIL_PROVIDER_API_KEY=smoke-email-key
  -e PAYMENT_PROVIDER=sepay
  -e SEPAY_ENV=sandbox
  -e SEPAY_MERCHANT_ID=smoke-merchant
  -e SEPAY_SECRET_KEY=smoke-sepay-secret-key
)
