-- Phase 09: partner status, modes, ledger idempotency, referral attributions
-- Assumes no production partner data. Dev reset: pnpm db:migrate && pnpm db:seed

DO $$ BEGIN
  CREATE TYPE "partner_status" AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "wallet_transaction_type" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT', 'REFUND', 'REVERSAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commission_status" AS ENUM ('pending', 'approved', 'available', 'paid', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "referral_attribution_kind" AS ENUM ('click', 'signup', 'order');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "status" "partner_status" NOT NULL DEFAULT 'pending';
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "modes" jsonb NOT NULL DEFAULT '["REFERRAL"]'::jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "allow_negative_balance" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "partners_status_idx" ON "partners" ("status");

ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "public_id" text;
UPDATE "wallet_transactions" SET "public_id" = 'wtx_' || replace(id::text, '-', '') WHERE "public_id" IS NULL;
ALTER TABLE "wallet_transactions" ALTER COLUMN "public_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_public_id_unique" ON "wallet_transactions" ("public_id");

ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
UPDATE "wallet_transactions" SET "idempotency_key" = id::text WHERE "idempotency_key" IS NULL;
ALTER TABLE "wallet_transactions" ALTER COLUMN "idempotency_key" SET NOT NULL;

ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "reference_type" text;

-- Migrate free-text type into enum (unknown values become ADJUSTMENT)
ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "type_enum" "wallet_transaction_type";
UPDATE "wallet_transactions" SET "type_enum" = CASE upper("type")
  WHEN 'CREDIT' THEN 'CREDIT'::wallet_transaction_type
  WHEN 'DEBIT' THEN 'DEBIT'::wallet_transaction_type
  WHEN 'ADJUSTMENT' THEN 'ADJUSTMENT'::wallet_transaction_type
  WHEN 'REFUND' THEN 'REFUND'::wallet_transaction_type
  WHEN 'REVERSAL' THEN 'REVERSAL'::wallet_transaction_type
  ELSE 'ADJUSTMENT'::wallet_transaction_type
END
WHERE "type_enum" IS NULL;
ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "type";
ALTER TABLE "wallet_transactions" RENAME COLUMN "type_enum" TO "type";
ALTER TABLE "wallet_transactions" ALTER COLUMN "type" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_tx_wallet_idempotency_unique"
  ON "wallet_transactions" ("wallet_id", "idempotency_key");

ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "public_id" text;
UPDATE "commissions" SET "public_id" = 'com_' || replace(id::text, '-', '') WHERE "public_id" IS NULL;
ALTER TABLE "commissions" ALTER COLUMN "public_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "commissions_public_id_unique" ON "commissions" ("public_id");

ALTER TABLE "commissions" ALTER COLUMN "amount_minor" TYPE bigint USING "amount_minor"::bigint;

ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "status_enum" "commission_status";
UPDATE "commissions" SET "status_enum" = CASE lower("status")
  WHEN 'pending' THEN 'pending'::commission_status
  WHEN 'approved' THEN 'approved'::commission_status
  WHEN 'available' THEN 'available'::commission_status
  WHEN 'paid' THEN 'paid'::commission_status
  WHEN 'reversed' THEN 'reversed'::commission_status
  ELSE 'pending'::commission_status
END
WHERE "status_enum" IS NULL;
ALTER TABLE "commissions" DROP COLUMN IF EXISTS "status";
ALTER TABLE "commissions" RENAME COLUMN "status_enum" TO "status";
ALTER TABLE "commissions" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "status" SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS "commissions_partner_order_unique"
  ON "commissions" ("partner_id", "order_id")
  WHERE "order_id" IS NOT NULL;

ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "public_id" text;
UPDATE "referrals" SET "public_id" = 'ref_' || replace(id::text, '-', '') WHERE "public_id" IS NULL;
ALTER TABLE "referrals" ALTER COLUMN "public_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_public_id_unique" ON "referrals" ("public_id");
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "label" text;
ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_user_id";

CREATE TABLE IF NOT EXISTS "referral_attributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE restrict,
  "referral_id" uuid NOT NULL REFERENCES "referrals"("id") ON DELETE restrict,
  "kind" "referral_attribution_kind" NOT NULL,
  "visitor_hash" text,
  "user_id" text REFERENCES "user"("id") ON DELETE set null,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "referral_attributions_partner_id_idx" ON "referral_attributions" ("partner_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_attributions_signup_user_unique"
  ON "referral_attributions" ("user_id")
  WHERE "kind" = 'signup' AND "user_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "referral_attributions_order_unique"
  ON "referral_attributions" ("order_id")
  WHERE "kind" = 'order' AND "order_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "referral_attributions_click_visitor_unique"
  ON "referral_attributions" ("referral_id", "visitor_hash")
  WHERE "kind" = 'click' AND "visitor_hash" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "partner_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE restrict,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "partner_customer_partner_user_unique" UNIQUE("partner_id","user_id")
);
CREATE INDEX IF NOT EXISTS "partner_customers_partner_id_idx" ON "partner_customers" ("partner_id");

CREATE TABLE IF NOT EXISTS "partner_issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE restrict,
  "customer_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "entitlement_id" uuid NOT NULL REFERENCES "entitlements"("id") ON DELETE restrict,
  "plan_id" uuid NOT NULL REFERENCES "plans"("id") ON DELETE restrict,
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'issue',
  "idempotency_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "partner_issue_idempotency_unique" UNIQUE("partner_id","idempotency_key")
);
CREATE INDEX IF NOT EXISTS "partner_issues_partner_id_idx" ON "partner_issues" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_issues_entitlement_id_idx" ON "partner_issues" ("entitlement_id");
