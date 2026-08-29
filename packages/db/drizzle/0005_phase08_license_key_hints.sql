-- Phase 08: license key identification hints (hash stays the secret)
-- Assumes no production data. Dev reset: pnpm db:migrate && pnpm db:seed

ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "key_prefix" text;
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "key_last4" text;

CREATE UNIQUE INDEX IF NOT EXISTS "licenses_key_hash_unique"
  ON "licenses" ("key_hash")
  WHERE "key_hash" IS NOT NULL;
