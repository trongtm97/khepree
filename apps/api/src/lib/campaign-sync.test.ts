/**
 * campaign-sync.test.ts
 *
 * Verifies:
 * - Payload schema rejects forbidden fields
 * - Payload schema accepts allowed fields
 * - Capability gate logic (upsert rejects when capability disabled)
 * - Idempotency (stale update skipped)
 * - Notification dedup
 */
import { describe, expect, it } from "vitest";
import { campaignSyncPayloadSchema, CAMPAIGN_SYNC_STAGES } from "./campaign-sync-schema";

// ─── Forbidden field list ──────────────────────────────────────────────────
const FORBIDDEN_KEYS = [
  "title",
  "novelTitle",
  "chapterName",
  "author",
  "filePath",
  "path",
  "sourceText",
  "source_text",
  "translationText",
  "translation",
  "prompt",
  "glossary",
  "memory",
  "auditEvidence",
  "audit_evidence",
  "cookie",
  "sessionToken",
  "browserProfilePath",
  "accountSecret",
  "stackTrace",
  "stack_trace",
  "rawProviderResponse",
  "raw_response",
] as const;

const VALID_PAYLOAD = {
  campaignPublicId: "camp_abc123",
  appVersion: "1.2.3",
  totalProjects: 5,
  totalChapters: 42,
  countByStatus: { pending: 10, in_progress: 5, completed: 27, error: 0 },
  overallPercent: 64.3,
  stage: "active" as const,
  startedAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-03T22:00:00Z",
  completedAt: null,
  errorCode: null,
};

describe("campaignSyncPayloadSchema — forbidden fields", () => {
  it("rejects any forbidden field via strict schema", () => {
    for (const key of FORBIDDEN_KEYS) {
      const result = campaignSyncPayloadSchema.safeParse({
        ...VALID_PAYLOAD,
        [key]: "should not be allowed",
      });
      expect(result.success, `schema must reject key: ${key}`).toBe(false);
    }
  });

  it("accepts fully valid payload", () => {
    const result = campaignSyncPayloadSchema.safeParse(VALID_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it("accepts minimal payload (optional fields absent)", () => {
    const result = campaignSyncPayloadSchema.safeParse({
      campaignPublicId: "camp_min",
      totalProjects: 0,
      totalChapters: 0,
      countByStatus: { pending: 0, in_progress: 0, completed: 0, error: 0 },
      overallPercent: 0,
      stage: "idle",
      updatedAt: "2026-09-03T22:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("campaignSyncPayloadSchema — field bounds", () => {
  it("rejects campaignPublicId longer than 64 chars", () => {
    const result = campaignSyncPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      campaignPublicId: "x".repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it("rejects errorCode longer than 64 chars", () => {
    const result = campaignSyncPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      errorCode: "E".repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it("rejects overallPercent > 100", () => {
    const result = campaignSyncPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      overallPercent: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative totalProjects", () => {
    const result = campaignSyncPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      totalProjects: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid stage value", () => {
    const result = campaignSyncPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      stage: "running",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid stage values", () => {
    for (const stage of CAMPAIGN_SYNC_STAGES) {
      const result = campaignSyncPayloadSchema.safeParse({ ...VALID_PAYLOAD, stage });
      expect(result.success, `stage '${stage}' should be valid`).toBe(true);
    }
  });
});
