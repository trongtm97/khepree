-- Phase 14: transactional outbox, BIGINT media sizes, partner default currency VND
-- Dev reset: pnpm db:migrate && pnpm db:seed

CREATE TYPE "outbox_status" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_poll_idx" ON "outbox_events" USING btree ("status","available_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_aggregate_idx" ON "outbox_events" USING btree ("aggregate_type","aggregate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_event_type_idx" ON "outbox_events" USING btree ("event_type");
--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "size_bytes" SET DATA TYPE bigint;
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "default_currency" text DEFAULT 'VND' NOT NULL;
--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'VND';
