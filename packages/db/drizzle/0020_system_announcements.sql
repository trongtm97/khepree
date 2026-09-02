-- Phase B06: broadcast system announcements (not per-user notification fan-out)

CREATE TYPE "announcement_severity" AS ENUM(
  'info',
  'success',
  'warning',
  'error',
  'action_required'
);
--> statement-breakpoint
CREATE TYPE "announcement_status" AS ENUM('draft', 'published', 'expired', 'archived');
--> statement-breakpoint
CREATE TYPE "announcement_cta_kind" AS ENUM('none', 'open_url', 'open_path');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"product_id" uuid,
	"severity" "announcement_severity" DEFAULT 'info' NOT NULL,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"target_platform" "release_platform",
	"target_architecture" "release_architecture",
	"release_channel" "release_channel",
	"minimum_app_version" text,
	"maximum_app_version" text,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"cta_kind" "announcement_cta_kind" DEFAULT 'none' NOT NULL,
	"cta_payload" jsonb,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_announcements_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcement_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_translation_announcement_locale_unique" UNIQUE("announcement_id","locale")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcement_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"first_delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_receipt_announcement_user_unique" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "announcement_translations" ADD CONSTRAINT "announcement_translations_announcement_id_system_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."system_announcements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcement_id_system_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."system_announcements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_announcements_status_starts_at_idx" ON "system_announcements" USING btree ("status","starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_announcements_product_status_idx" ON "system_announcements" USING btree ("product_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_announcements_published_at_idx" ON "system_announcements" USING btree ("published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_announcements_target_platform_idx" ON "system_announcements" USING btree ("target_platform");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_announcements_release_channel_idx" ON "system_announcements" USING btree ("release_channel");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_translations_announcement_id_idx" ON "announcement_translations" USING btree ("announcement_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_receipts_user_id_idx" ON "announcement_receipts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_receipts_announcement_id_idx" ON "announcement_receipts" USING btree ("announcement_id");
