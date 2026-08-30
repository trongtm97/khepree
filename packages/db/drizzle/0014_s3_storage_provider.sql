ALTER TYPE "public"."storage_provider" ADD VALUE 's3';--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN IF NOT EXISTS "body_checksum_sha256" text;
