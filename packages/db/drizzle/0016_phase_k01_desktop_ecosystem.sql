-- Phase K01: generic desktop client registry, authorization codes, desktop sessions
-- Dev reset: pnpm db:migrate && pnpm db:seed

CREATE TYPE "desktop_client_status" AS ENUM('active', 'inactive');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desktop_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"allowed_redirect_uris" jsonb NOT NULL,
	"status" "desktop_client_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "desktop_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desktop_auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"desktop_client_id" uuid NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text DEFAULT 'S256' NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "desktop_auth_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desktop_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" text NOT NULL,
	"desktop_client_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"device_id" uuid,
	"device_public_key" text,
	"access_token_hash" text NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"rotation_version" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "desktop_sessions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "desktop_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
ALTER TABLE "desktop_clients" ADD CONSTRAINT "desktop_clients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "desktop_auth_codes" ADD CONSTRAINT "desktop_auth_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "desktop_auth_codes" ADD CONSTRAINT "desktop_auth_codes_desktop_client_id_desktop_clients_id_fk" FOREIGN KEY ("desktop_client_id") REFERENCES "public"."desktop_clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "desktop_sessions" ADD CONSTRAINT "desktop_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "desktop_sessions" ADD CONSTRAINT "desktop_sessions_desktop_client_id_desktop_clients_id_fk" FOREIGN KEY ("desktop_client_id") REFERENCES "public"."desktop_clients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "desktop_sessions" ADD CONSTRAINT "desktop_sessions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "desktop_sessions" ADD CONSTRAINT "desktop_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_clients_product_id_idx" ON "desktop_clients" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_clients_status_idx" ON "desktop_clients" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_auth_codes_user_id_idx" ON "desktop_auth_codes" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_auth_codes_client_id_idx" ON "desktop_auth_codes" USING btree ("desktop_client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_auth_codes_expires_at_idx" ON "desktop_auth_codes" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_sessions_user_id_idx" ON "desktop_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_sessions_client_id_idx" ON "desktop_sessions" USING btree ("desktop_client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_sessions_access_token_hash_idx" ON "desktop_sessions" USING btree ("access_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desktop_sessions_revoked_at_idx" ON "desktop_sessions" USING btree ("revoked_at");
