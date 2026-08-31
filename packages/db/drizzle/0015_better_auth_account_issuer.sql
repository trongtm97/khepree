ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text DEFAULT 'local:credential' NOT NULL;--> statement-breakpoint
UPDATE "account" SET "issuer" = 'local:credential' WHERE "issuer" IS NULL OR "issuer" = '';
