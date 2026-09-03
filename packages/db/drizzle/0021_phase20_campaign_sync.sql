-- Phase 20: Campaign sync states — opt-in aggregate status push from desktop
-- No story content, filenames, or secrets stored; only counts and stage.

-- Add dedup key column to notifications (safe: nullable, no data loss)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "resource_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_resource_id_idx" ON "notifications" ("channel", "resource_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "campaign_sync_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"campaign_public_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"app_version" text,
	"total_projects" integer DEFAULT 0 NOT NULL,
	"total_chapters" integer DEFAULT 0 NOT NULL,
	"count_by_status" jsonb NOT NULL,
	"overall_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"stage" text DEFAULT 'idle' NOT NULL,
	"started_at" timestamp with time zone,
	"updated_at_client" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_sync_states_user_campaign_uniq" UNIQUE("user_id","campaign_public_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_sync_states"
	ADD CONSTRAINT "campaign_sync_states_user_id_fkey"
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "campaign_sync_states"
	ADD CONSTRAINT "campaign_sync_states_product_id_fkey"
	FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_sync_states_user_id_idx" ON "campaign_sync_states" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_sync_states_expires_at_idx" ON "campaign_sync_states" ("expires_at");
