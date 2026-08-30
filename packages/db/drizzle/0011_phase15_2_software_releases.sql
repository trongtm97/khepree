-- Phase 15.2: software release domain for desktop installers
-- Dev reset: pnpm db:migrate && pnpm db:seed

CREATE TYPE "release_status" AS ENUM('draft', 'published', 'retired');
--> statement-breakpoint
CREATE TYPE "release_platform" AS ENUM('windows', 'macos', 'linux');
--> statement-breakpoint
CREATE TYPE "release_architecture" AS ENUM('x64', 'arm64', 'universal');
--> statement-breakpoint
CREATE TYPE "release_channel" AS ENUM('stable', 'beta', 'alpha');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "software_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"version" text NOT NULL,
	"platform" "release_platform" NOT NULL,
	"architecture" "release_architecture" NOT NULL,
	"channel" "release_channel" DEFAULT 'stable' NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"checksum_sha256" text NOT NULL,
	"signature" text,
	"minimum_supported_version" text,
	"mandatory_update" boolean DEFAULT false NOT NULL,
	"status" "release_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "software_releases_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "software_releases_product_version_target_unique" UNIQUE("product_id","version","platform","architecture","channel")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "release_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"release_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_translation_release_locale_unique" UNIQUE("release_id","locale")
);
--> statement-breakpoint
ALTER TABLE "software_releases" ADD CONSTRAINT "software_releases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "software_releases" ADD CONSTRAINT "software_releases_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "release_translations" ADD CONSTRAINT "release_translations_release_id_software_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."software_releases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_releases_product_id_idx" ON "software_releases" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_releases_status_idx" ON "software_releases" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_releases_published_at_idx" ON "software_releases" USING btree ("published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "release_translations_release_id_idx" ON "release_translations" USING btree ("release_id");
