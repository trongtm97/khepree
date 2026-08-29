-- Phase 06.5: architecture hardening — pre-production schema corrections
-- Assumes no production data. Dev reset: pnpm db:migrate && pnpm db:seed

-- ---------------------------------------------------------------------------
-- Catalog i18n + feature integrity + price bigint
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "product_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "name" text NOT NULL,
  "short_description" text,
  "description" text,
  "content" text,
  "seo_title" text,
  "seo_description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_translation_product_locale_unique" UNIQUE("product_id","locale")
);

INSERT INTO "product_translations" ("product_id", "locale", "name", "short_description", "description", "content", "seo_title", "seo_description")
SELECT "id", 'en', COALESCE("name", "slug"), "short_description", "description", "content", "seo_title", "seo_description"
FROM "products"
ON CONFLICT DO NOTHING;

INSERT INTO "product_translations" ("product_id", "locale", "name", "short_description", "description", "content", "seo_title", "seo_description")
SELECT "id", 'vi', COALESCE("name", "slug"), "short_description", "description", "content", "seo_title", "seo_description"
FROM "products"
WHERE NOT EXISTS (
  SELECT 1 FROM "product_translations" pt WHERE pt.product_id = products.id AND pt.locale = 'vi'
);

ALTER TABLE "products" DROP COLUMN IF EXISTS "name";
ALTER TABLE "products" DROP COLUMN IF EXISTS "short_description";
ALTER TABLE "products" DROP COLUMN IF EXISTS "description";
ALTER TABLE "products" DROP COLUMN IF EXISTS "content";
ALTER TABLE "products" DROP COLUMN IF EXISTS "seo_title";
ALTER TABLE "products" DROP COLUMN IF EXISTS "seo_description";

CREATE TABLE IF NOT EXISTS "plan_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL REFERENCES "plans"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plan_translation_plan_locale_unique" UNIQUE("plan_id","locale")
);

INSERT INTO "plan_translations" ("plan_id", "locale", "name")
SELECT "id", 'en', "name" FROM "plans"
ON CONFLICT DO NOTHING;

INSERT INTO "plan_translations" ("plan_id", "locale", "name")
SELECT "id", 'vi', "name" FROM "plans"
WHERE NOT EXISTS (SELECT 1 FROM "plan_translations" pt WHERE pt.plan_id = plans.id AND pt.locale = 'vi');

ALTER TABLE "plans" DROP COLUMN IF EXISTS "name";

CREATE TABLE IF NOT EXISTS "feature_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "feature_id" uuid NOT NULL REFERENCES "features"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feature_translation_feature_locale_unique" UNIQUE("feature_id","locale")
);

INSERT INTO "feature_translations" ("feature_id", "locale", "name", "description")
SELECT "id", 'en', "name", "description" FROM "features"
ON CONFLICT DO NOTHING;

ALTER TABLE "features" DROP COLUMN IF EXISTS "name";

ALTER TABLE "plan_features" DROP COLUMN IF EXISTS "value_type";

ALTER TABLE "prices" ALTER COLUMN "amount_minor" TYPE bigint USING "amount_minor"::bigint;

CREATE UNIQUE INDEX IF NOT EXISTS "prices_active_identity_unique"
  ON "prices" ("plan_id", "currency", COALESCE("region", ''), COALESCE("interval", ''))
  WHERE "is_active" = true;

-- ---------------------------------------------------------------------------
-- Commerce hardening
-- ---------------------------------------------------------------------------

ALTER TABLE "customers" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_user_id_unique";
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE restrict;
CREATE UNIQUE INDEX IF NOT EXISTS "customers_user_id_unique" ON "customers" ("user_id") WHERE "user_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "customers_organization_id_unique" ON "customers" ("organization_id") WHERE "organization_id" IS NOT NULL;
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_exactly_one_owner";
ALTER TABLE "customers" ADD CONSTRAINT "customers_exactly_one_owner" CHECK (
  ("user_id" IS NOT NULL AND "organization_id" IS NULL)
  OR ("user_id" IS NULL AND "organization_id" IS NOT NULL)
);

ALTER TYPE "public"."order_status" RENAME TO "order_status_old";
CREATE TYPE "public"."order_status" AS ENUM('draft', 'pending_payment', 'paid', 'cancelled', 'refunded', 'partially_refunded');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."order_status" USING (
  CASE "status"::text
    WHEN 'pending' THEN 'pending_payment'
    WHEN 'paid' THEN 'paid'
    WHEN 'failed' THEN 'cancelled'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'draft'
  END
)::"public"."order_status";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'draft';
DROP TYPE "public"."order_status_old";

ALTER TABLE "orders" ALTER COLUMN "total_minor" TYPE bigint USING "total_minor"::bigint;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_id" uuid REFERENCES "products"("id") ON DELETE restrict;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "price_id" uuid REFERENCES "prices"("id") ON DELETE restrict;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_name_snapshot" text;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "plan_name_snapshot" text;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "billing_interval_snapshot" text;
ALTER TABLE "order_items" ALTER COLUMN "unit_amount_minor" TYPE bigint USING "unit_amount_minor"::bigint;

ALTER TABLE "payments" ALTER COLUMN "amount_minor" TYPE bigint USING "amount_minor"::bigint;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_payment_unique"
  ON "payments" ("provider", "provider_payment_id")
  WHERE "provider_payment_id" IS NOT NULL;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "price_id" uuid REFERENCES "prices"("id") ON DELETE restrict;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider_subscription_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_subscription_unique"
  ON "subscriptions" ("provider", "provider_subscription_id")
  WHERE "provider_subscription_id" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Licensing / device / lease hardening
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."license_status" AS ENUM('active', 'suspended', 'revoked');
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "status" "license_status" DEFAULT 'active' NOT NULL;
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "revoked_reason" text;

ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "devices_fingerprint_unique";
ALTER TABLE "devices" RENAME COLUMN "fingerprint" TO "installation_hash";
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "principal_type" "principal_type";
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "principal_id" text;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "first_seen_at" timestamp with time zone DEFAULT now();
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone DEFAULT now();
UPDATE "devices" SET "principal_type" = 'USER', "principal_id" = 'legacy', "status" = 'active' WHERE "principal_type" IS NULL;

CREATE TYPE "public"."device_status" AS ENUM('active', 'deactivated', 'blocked');
ALTER TABLE "devices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "devices" ALTER COLUMN "status" TYPE "device_status" USING lower("status")::"device_status";
ALTER TABLE "devices" ALTER COLUMN "status" SET DEFAULT 'active';
ALTER TABLE "devices" ALTER COLUMN "principal_type" SET NOT NULL;
ALTER TABLE "devices" ALTER COLUMN "principal_id" SET NOT NULL;
ALTER TABLE "devices" ADD CONSTRAINT "devices_principal_installation_unique" UNIQUE("principal_type", "principal_id", "installation_hash");

CREATE TYPE "public"."activation_status" AS ENUM('active', 'deactivated');
ALTER TABLE "activations" ADD COLUMN IF NOT EXISTS "status" "activation_status" DEFAULT 'active' NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "activations_active_license_device_unique"
  ON "activations" ("license_id", "device_id")
  WHERE "status" = 'active' AND "deactivated_at" IS NULL;

ALTER TABLE "license_leases" ADD COLUMN IF NOT EXISTS "jti" text;
ALTER TABLE "license_leases" ADD COLUMN IF NOT EXISTS "lease_hash" text;
ALTER TABLE "license_leases" ADD COLUMN IF NOT EXISTS "schema_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "license_leases" ADD COLUMN IF NOT EXISTS "key_id" text;
UPDATE "license_leases" SET "jti" = "lease_token" WHERE "jti" IS NULL;
ALTER TABLE "license_leases" ALTER COLUMN "jti" SET NOT NULL;
ALTER TABLE "license_leases" DROP CONSTRAINT IF EXISTS "license_leases_lease_token_unique";
ALTER TABLE "license_leases" DROP COLUMN IF EXISTS "lease_token";
CREATE UNIQUE INDEX IF NOT EXISTS "license_leases_jti_unique" ON "license_leases" ("jti");

-- ---------------------------------------------------------------------------
-- CMS published uniqueness + legal consents
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "content_versions_one_published_per_locale"
  ON "content_versions" ("entry_id", "locale")
  WHERE "status" = 'PUBLISHED';

CREATE TYPE "public"."legal_document_type" AS ENUM('TERMS', 'PRIVACY');
CREATE TABLE IF NOT EXISTS "user_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "document_type" "legal_document_type" NOT NULL,
  "document_version" text NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_consent_unique" UNIQUE("user_id","document_type","document_version")
);

-- Partner wallet money fields
ALTER TABLE "partner_prices" ALTER COLUMN "amount_minor" TYPE bigint USING "amount_minor"::bigint;
ALTER TABLE "wallets" ALTER COLUMN "balance_minor" TYPE bigint USING "balance_minor"::bigint;
ALTER TABLE "wallet_transactions" ALTER COLUMN "amount_minor" TYPE bigint USING "amount_minor"::bigint;
