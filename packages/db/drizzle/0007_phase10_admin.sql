-- Phase 10: admin user status (suspend without deleting identity)
-- Dev reset: pnpm db:migrate && pnpm db:seed

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;
