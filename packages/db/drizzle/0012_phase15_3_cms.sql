-- Phase 15.3: CMS categories, author, featured image, scheduling placeholder
-- Dev reset: pnpm db:migrate && pnpm db:seed

CREATE TABLE IF NOT EXISTS "content_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_categories_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "content_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_category_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_category_translation_unique" UNIQUE("category_id","locale")
);
--> statement-breakpoint
ALTER TABLE "content_category_translations" ADD CONSTRAINT "content_category_translations_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_categories_slug_idx" ON "content_categories" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_category_translations_category_id_idx" ON "content_category_translations" USING btree ("category_id");
--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN IF NOT EXISTS "featured_media_id" uuid;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN IF NOT EXISTS "author_user_id" text;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN IF NOT EXISTS "category_id" uuid;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_featured_media_id_media_assets_id_fk" FOREIGN KEY ("featured_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE set null ON UPDATE no action;
