-- Phase 13: Vietnam-first commerce, licensing policy, refund ledger
-- Dev reset: pnpm db:migrate && pnpm db:seed

DO $$ BEGIN
  CREATE TYPE "licensing_mode" AS ENUM ('NONE', 'ACCOUNT', 'DEVICE_LEASE', 'LICENSE_KEY_DEVICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "licensing_mode" "licensing_mode" NOT NULL DEFAULT 'LICENSE_KEY_DEVICE';

ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "access_term_days" integer;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "access_term_days_snapshot" integer;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "method" text;

ALTER TABLE "user_profiles"
  ALTER COLUMN "locale" SET DEFAULT 'vi';

DO $$ BEGIN
  CREATE TYPE "refund_status" AS ENUM ('pending', 'succeeded', 'failed', 'manual_required');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL,
  "payment_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_refund_id" text,
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL,
  "status" "refund_status" DEFAULT 'pending' NOT NULL,
  "reason" text,
  "initiated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "refunds_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE restrict
);

CREATE INDEX IF NOT EXISTS "refunds_payment_id_idx" ON "refunds" ("payment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "refunds_provider_refund_unique"
  ON "refunds" ("provider", "provider_refund_id")
  WHERE "provider_refund_id" IS NOT NULL;
