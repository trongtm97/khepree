-- Phase 16: public URL redirects for the marketing site
-- Dev reset: pnpm db:migrate && pnpm db:seed

CREATE TABLE IF NOT EXISTS "url_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status" integer DEFAULT 308 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "url_redirects_from_path_unique" UNIQUE("from_path")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "url_redirects_active_idx" ON "url_redirects" USING btree ("is_active");
