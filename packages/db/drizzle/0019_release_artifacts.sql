-- Phase B02: multi-artifact software releases (Electron Squirrel.Windows)
-- Backfills legacy single-file rows as installer artifacts. Legacy columns on
-- software_releases are retained for backward compatibility until a later phase.
--
-- Rollback (manual, after deploy revert):
--   DROP TABLE IF EXISTS "release_artifacts";
--   DROP TYPE IF EXISTS "release_artifact_kind";
-- Legacy software_releases columns (media_asset_id, file_name, …) are untouched.

CREATE TYPE "release_artifact_kind" AS ENUM(
  'installer',
  'full-nupkg',
  'delta-nupkg',
  'releases-index'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "release_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"release_id" uuid NOT NULL,
	"kind" "release_artifact_kind" NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"signature" text,
	"signing_key_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_artifacts_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "release_artifacts_release_file_unique" UNIQUE("release_id","file_name")
);
--> statement-breakpoint
ALTER TABLE "release_artifacts" ADD CONSTRAINT "release_artifacts_release_id_software_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."software_releases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "release_artifacts" ADD CONSTRAINT "release_artifacts_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "release_artifacts_release_singleton_kind_unique"
  ON "release_artifacts" ("release_id", "kind")
  WHERE "kind" IN ('installer', 'full-nupkg', 'releases-index');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "release_artifacts_release_id_idx" ON "release_artifacts" USING btree ("release_id");
--> statement-breakpoint
INSERT INTO "release_artifacts" (
	"public_id",
	"release_id",
	"kind",
	"media_asset_id",
	"file_name",
	"content_type",
	"size_bytes",
	"sha256",
	"signature",
	"created_at"
)
SELECT
	'rart_' || replace(replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', ''),
	"id",
	'installer',
	"media_asset_id",
	"file_name",
	'application/octet-stream',
	"file_size",
	"checksum_sha256",
	"signature",
	COALESCE("created_at", now())
FROM "software_releases"
WHERE NOT EXISTS (
	SELECT 1 FROM "release_artifacts" ra WHERE ra."release_id" = "software_releases"."id"
);
