import { and, eq } from "drizzle-orm";
import { campaignSyncStates, getDb, notifications, type Database } from "@khepree/db";
import { resolveDesktopCapabilities, snapshotFromEntries } from "@khepree/entitlement";
import type { FeatureSnapshotEntry } from "@khepree/entitlement";
export {
  CAMPAIGN_SYNC_STAGES,
  campaignSyncPayloadSchema,
  type CampaignSyncPayload,
  type CampaignSyncStage,
} from "./campaign-sync-schema";
import type { CampaignSyncPayload } from "./campaign-sync-schema";

// Retention: 90 days from last upsert
const SYNC_RETENTION_DAYS = 90;

export interface CampaignSyncInput {
  userId: string;
  productId: string;
  payload: CampaignSyncPayload;
  featureEntries?: FeatureSnapshotEntry[];
}

export class CampaignSyncError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CampaignSyncError";
  }
}

export function isCampaignSyncError(e: unknown): e is CampaignSyncError {
  return e instanceof CampaignSyncError;
}

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SYNC_RETENTION_DAYS);
  return d;
}

export async function upsertCampaignSync(
  input: CampaignSyncInput,
  db: Database = getDb()!,
): Promise<{ syncedAt: string }> {
  // Capability gate
  const snap = snapshotFromEntries(input.featureEntries ?? []);
  const caps = resolveDesktopCapabilities(snap);
  if (!caps.campaignStatusSyncEnabled) {
    throw new CampaignSyncError("CAPABILITY_DISABLED", "campaign_status_sync_enabled is not active for this entitlement");
  }

  const { payload } = input;
  const clientUpdatedAt = new Date(payload.updatedAt);
  const now = new Date();

  // Idempotent upsert — only advance if client timestamp is >= stored
  const existing = await db
    .select({ updatedAtClient: campaignSyncStates.updatedAtClient, stage: campaignSyncStates.stage })
    .from(campaignSyncStates)
    .where(
      and(
        eq(campaignSyncStates.userId, input.userId),
        eq(campaignSyncStates.campaignPublicId, payload.campaignPublicId),
      ),
    )
    .limit(1);

  const existingRow = existing[0];
  if (existingRow && existingRow.updatedAtClient > clientUpdatedAt) {
    // Stale update — return current server time without overwriting
    return { syncedAt: now.toISOString() };
  }

  const previousStage = existingRow?.stage ?? null;

  await db
    .insert(campaignSyncStates)
    .values({
      userId: input.userId,
      campaignPublicId: payload.campaignPublicId,
      productId: input.productId,
      appVersion: payload.appVersion ?? null,
      totalProjects: payload.totalProjects,
      totalChapters: payload.totalChapters,
      countByStatus: payload.countByStatus,
      overallPercent: String(payload.overallPercent),
      stage: payload.stage,
      startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
      updatedAtClient: clientUpdatedAt,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
      errorCode: payload.errorCode ?? null,
      expiresAt: expiresAt(),
    })
    .onConflictDoUpdate({
      target: [campaignSyncStates.userId, campaignSyncStates.campaignPublicId],
      set: {
        appVersion: payload.appVersion ?? null,
        totalProjects: payload.totalProjects,
        totalChapters: payload.totalChapters,
        countByStatus: payload.countByStatus,
        overallPercent: String(payload.overallPercent),
        stage: payload.stage,
        startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
        updatedAtClient: clientUpdatedAt,
        completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
        errorCode: payload.errorCode ?? null,
        expiresAt: expiresAt(),
        updatedAt: now,
      },
    });

  // Notify on stage transition to completed/error (deduplicated by channel+resource)
  const shouldNotify =
    (payload.stage === "completed" || payload.stage === "error") &&
    payload.stage !== previousStage;

  if (shouldNotify) {
    await insertCompletionNotification(db, {
      userId: input.userId,
      campaignPublicId: payload.campaignPublicId,
      stage: payload.stage,
    });
  }

  return { syncedAt: now.toISOString() };
}

export async function deleteCampaignSync(
  input: { userId: string; campaignPublicId: string },
  db: Database = getDb()!,
): Promise<void> {
  await db
    .delete(campaignSyncStates)
    .where(
      and(
        eq(campaignSyncStates.userId, input.userId),
        eq(campaignSyncStates.campaignPublicId, input.campaignPublicId),
      ),
    );
}

async function insertCompletionNotification(
  db: Database,
  input: { userId: string; campaignPublicId: string; stage: string },
): Promise<void> {
  const resourceId = `${input.userId}:${input.campaignPublicId}:${input.stage}`;
  // Deduplicate: skip if a notification for this exact (user, campaign, stage) already exists
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, input.userId),
        eq(notifications.channel, "campaign_sync"),
        eq(notifications.resourceId, resourceId),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  const isError = input.stage === "error";
  await db.insert(notifications).values({
    userId: input.userId,
    channel: "campaign_sync",
    resourceId,
    title: isError
      ? "Campaign encountered an error"
      : "Campaign completed",
    body: isError
      ? `Campaign ${input.campaignPublicId} stopped with an error.`
      : `Campaign ${input.campaignPublicId} finished successfully.`,
  });
}
