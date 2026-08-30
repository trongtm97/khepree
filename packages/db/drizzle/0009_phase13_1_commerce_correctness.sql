-- Phase 13.1: voided payment/order statuses + provider subscription id on payments
-- Do not use 'voided' in DML in this file: ADD VALUE is not usable until commit.
-- Dev reset: pnpm db:migrate && pnpm db:seed

ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'voided';
--> statement-breakpoint
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'voided';
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_subscription_id" text;
