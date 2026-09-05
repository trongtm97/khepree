-- CTA kind software_update + optional related_release_id for release↔notify idempotency

ALTER TYPE "public"."announcement_cta_kind" ADD VALUE IF NOT EXISTS 'software_update';
--> statement-breakpoint

ALTER TABLE "system_announcements"
  ADD COLUMN IF NOT EXISTS "related_release_id" uuid
    REFERENCES "public"."software_releases"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "system_announcements_related_release_id_uidx"
  ON "system_announcements" ("related_release_id")
  WHERE "related_release_id" IS NOT NULL;
