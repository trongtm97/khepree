CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('r2', 'mock');--> statement-breakpoint
CREATE TYPE "public"."media_visibility" AS ENUM('public', 'private');--> statement-breakpoint
ALTER TABLE "content_versions" DROP CONSTRAINT "content_version_entry_locale_unique";--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "version_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_versions" RENAME COLUMN "summary" TO "excerpt";--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "body_storage_provider" "storage_provider";--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "body_storage_bucket" text;--> statement-breakpoint
ALTER TABLE "content_versions" RENAME COLUMN "body_storage_key" TO "body_object_key";--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "status_enum" "content_status";--> statement-breakpoint
UPDATE "content_versions" SET "status_enum" = CASE
  WHEN lower("status") = 'published' THEN 'PUBLISHED'::"content_status"
  WHEN lower("status") = 'archived' THEN 'ARCHIVED'::"content_status"
  ELSE 'DRAFT'::"content_status"
END;--> statement-breakpoint
ALTER TABLE "content_versions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "content_versions" RENAME COLUMN "status_enum" TO "status";--> statement-breakpoint
ALTER TABLE "content_versions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "content_versions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_version_entry_locale_version_unique" UNIQUE("entry_id","locale","version_number");--> statement-breakpoint
CREATE INDEX "content_versions_status_idx" ON "content_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_versions_published_at_idx" ON "content_versions" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "media_assets" RENAME COLUMN "storage_key" TO "object_key";--> statement-breakpoint
ALTER TABLE "media_assets" RENAME CONSTRAINT "media_assets_storage_key_unique" TO "media_assets_object_key_unique";--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "storage_provider" "storage_provider" DEFAULT 'mock' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "bucket" text;--> statement-breakpoint
UPDATE "media_assets" SET "bucket" = 'public' WHERE "bucket" IS NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "bucket" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "size_bytes" integer;--> statement-breakpoint
UPDATE "media_assets" SET "size_bytes" = 0 WHERE "size_bytes" IS NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "size_bytes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "checksum_sha256" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "visibility" "media_visibility";--> statement-breakpoint
UPDATE "media_assets" SET "visibility" = 'public' WHERE "visibility" IS NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "owner_type" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "context" text;--> statement-breakpoint
CREATE INDEX "media_assets_visibility_idx" ON "media_assets" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "media_assets_context_idx" ON "media_assets" USING btree ("context");
