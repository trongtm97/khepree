import { z } from "zod";

export const CAMPAIGN_SYNC_STAGES = ["idle", "active", "completed", "error"] as const;
export type CampaignSyncStage = (typeof CAMPAIGN_SYNC_STAGES)[number];

/** Closed schema — only allowed fields. .strict() rejects unknown top-level keys. */
export const campaignSyncPayloadSchema = z
  .object({
    campaignPublicId: z.string().min(1).max(64),
    appVersion: z.string().max(32).optional(),
    totalProjects: z.number().int().min(0),
    totalChapters: z.number().int().min(0),
    countByStatus: z.object({
      pending: z.number().int().min(0),
      in_progress: z.number().int().min(0),
      completed: z.number().int().min(0),
      error: z.number().int().min(0),
    }),
    overallPercent: z.number().min(0).max(100),
    stage: z.enum(CAMPAIGN_SYNC_STAGES),
    startedAt: z.string().datetime({ offset: true }).nullable().optional(),
    updatedAt: z.string().datetime({ offset: true }),
    completedAt: z.string().datetime({ offset: true }).nullable().optional(),
    errorCode: z.string().max(64).nullable().optional(),
  })
  .strict();

export type CampaignSyncPayload = z.infer<typeof campaignSyncPayloadSchema>;
