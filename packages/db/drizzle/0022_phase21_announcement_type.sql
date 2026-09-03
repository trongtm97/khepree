-- Phase 21: announcement type + per-locale CTA label
-- Adds announcement_type enum, type column (default 'general', backward-compatible),
-- and cta_label to announcement_translations.

DO $$ BEGIN
  CREATE TYPE "public"."announcement_type" AS ENUM('general', 'whats_new', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "system_announcements"
  ADD COLUMN IF NOT EXISTS "type" "announcement_type" NOT NULL DEFAULT 'general';
--> statement-breakpoint

ALTER TABLE "announcement_translations"
  ADD COLUMN IF NOT EXISTS "cta_label" text;
