/**
 * capabilities.test.ts — Verifies resolveDesktopCapabilities defaults and boundary behaviour.
 * Ponytail self-check: fails if resolver returns wrong defaults or ignores feature map entries.
 */
import { describe, expect, it } from "vitest";
import { resolveDesktopCapabilities } from "./features";
import { snapshotFromEntries } from "./features";
import {
  BATCH_IMPORT_FEATURE,
  CAMPAIGNS_FEATURE,
  CAMPAIGN_STATUS_SYNC_FEATURE,
  DEFAULT_BATCH_IMPORT_ENABLED,
  DEFAULT_CAMPAIGNS_ENABLED,
  DEFAULT_CAMPAIGN_STATUS_SYNC_ENABLED,
  DEFAULT_MAX_CAMPAIGN_PROJECTS,
  DEFAULT_MAX_CONCURRENT_NOVELS,
  DEFAULT_SERIES_MEMORY_ENABLED,
  DEFAULT_WHOLE_BOOK_AUDIT_ENABLED,
  MAX_CAMPAIGN_PROJECTS_FEATURE,
  MAX_CONCURRENT_NOVELS_FEATURE,
  SERIES_MEMORY_FEATURE,
  WHOLE_BOOK_AUDIT_FEATURE,
} from "./types";

const EMPTY = snapshotFromEntries([]);

describe("resolveDesktopCapabilities", () => {
  it("returns safe defaults on empty snapshot (old server / missing fields)", () => {
    const caps = resolveDesktopCapabilities(EMPTY);
    expect(caps.batchImportEnabled).toBe(DEFAULT_BATCH_IMPORT_ENABLED);
    expect(caps.campaignsEnabled).toBe(DEFAULT_CAMPAIGNS_ENABLED);
    expect(caps.maxCampaignProjects).toBe(DEFAULT_MAX_CAMPAIGN_PROJECTS);
    expect(caps.maxConcurrentNovels).toBe(DEFAULT_MAX_CONCURRENT_NOVELS);
    expect(caps.wholeBookAuditEnabled).toBe(DEFAULT_WHOLE_BOOK_AUDIT_ENABLED);
    expect(caps.seriesMemoryEnabled).toBe(DEFAULT_SERIES_MEMORY_ENABLED);
    expect(caps.campaignStatusSyncEnabled).toBe(DEFAULT_CAMPAIGN_STATUS_SYNC_ENABLED);
  });

  it("reads boolean capabilities from snapshot", () => {
    const snap = snapshotFromEntries([
      { key: BATCH_IMPORT_FEATURE, value: { valueType: "boolean", booleanValue: true } },
      { key: CAMPAIGNS_FEATURE, value: { valueType: "boolean", booleanValue: true } },
      { key: WHOLE_BOOK_AUDIT_FEATURE, value: { valueType: "boolean", booleanValue: true } },
      { key: SERIES_MEMORY_FEATURE, value: { valueType: "boolean", booleanValue: true } },
      { key: CAMPAIGN_STATUS_SYNC_FEATURE, value: { valueType: "boolean", booleanValue: true } },
    ]);
    const caps = resolveDesktopCapabilities(snap);
    expect(caps.batchImportEnabled).toBe(true);
    expect(caps.campaignsEnabled).toBe(true);
    expect(caps.wholeBookAuditEnabled).toBe(true);
    expect(caps.seriesMemoryEnabled).toBe(true);
    expect(caps.campaignStatusSyncEnabled).toBe(true);
  });

  it("reads integer capabilities from snapshot", () => {
    const snap = snapshotFromEntries([
      { key: MAX_CAMPAIGN_PROJECTS_FEATURE, value: { valueType: "integer", integerValue: 10 } },
      { key: MAX_CONCURRENT_NOVELS_FEATURE, value: { valueType: "integer", integerValue: 5 } },
    ]);
    const caps = resolveDesktopCapabilities(snap);
    expect(caps.maxCampaignProjects).toBe(10);
    expect(caps.maxConcurrentNovels).toBe(5);
  });

  it("clamps integer capabilities to minimum of 1 (no zero/negative grants)", () => {
    const snap = snapshotFromEntries([
      { key: MAX_CAMPAIGN_PROJECTS_FEATURE, value: { valueType: "integer", integerValue: 0 } },
      { key: MAX_CONCURRENT_NOVELS_FEATURE, value: { valueType: "integer", integerValue: -5 } },
    ]);
    const caps = resolveDesktopCapabilities(snap);
    expect(caps.maxCampaignProjects).toBe(1);
    expect(caps.maxConcurrentNovels).toBe(1);
  });

  it("explicit false disables capabilities (not just missing key)", () => {
    const snap = snapshotFromEntries([
      { key: BATCH_IMPORT_FEATURE, value: { valueType: "boolean", booleanValue: false } },
    ]);
    const caps = resolveDesktopCapabilities(snap);
    expect(caps.batchImportEnabled).toBe(false);
  });
});
