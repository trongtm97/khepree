-- Phase 06: product catalog enums, fields, and price regions

ALTER TYPE "public"."product_status" RENAME VALUE 'archived' TO 'retired';--> statement-breakpoint
ALTER TYPE "public"."product_status" RENAME VALUE 'coming_soon' TO 'hidden';--> statement-breakpoint
ALTER TYPE "public"."plan_billing_type" ADD VALUE IF NOT EXISTS 'perpetual';--> statement-breakpoint
ALTER TYPE "public"."plan_billing_type" ADD VALUE IF NOT EXISTS 'custom';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "short_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seo_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "icon_media_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_icon_media_id_media_assets_id_fk" FOREIGN KEY ("icon_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "prices" ADD COLUMN IF NOT EXISTS "region" text;
