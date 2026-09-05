import { describe, expect, it, vi } from "vitest";
import { AnnouncementService } from "./service";
import type { AnnouncementRecord } from "./types";

describe("AnnouncementService.publishWhatsNewForRelease", () => {
  it("returns existing announcement without creating when related_release_id matches", async () => {
    const existing: AnnouncementRecord = {
      id: "ann-1",
      publicId: "ann_existing",
      productId: "prod-1",
      relatedReleaseId: "rel-id",
      severity: "info",
      status: "published",
      type: "whats_new",
      targetPlatform: "windows",
      targetArchitecture: "x64",
      releaseChannel: "stable",
      minimumAppVersion: null,
      maximumAppVersion: "2.0.9999",
      startsAt: null,
      expiresAt: null,
      publishedAt: new Date(),
      ctaKind: "software_update",
      ctaPayload: { releasePublicId: "rel_abcdefghijkl", actions: ["download", "auto_update"] },
      createdBy: null,
      updatedBy: null,
      translations: [{ locale: "vi", title: "Có bản mới", body: null }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const service = new AnnouncementService({} as never, { record: async () => {} });
    vi.spyOn(service, "findByRelatedReleaseId").mockResolvedValue(existing);
    const createDraft = vi.spyOn(service, "createDraft");
    const publish = vi.spyOn(service, "publish");

    const result = await service.publishWhatsNewForRelease({
      id: "rel-id",
      publicId: "rel_abcdefghijkl",
      productId: "prod-1",
      version: "2.1.0",
      platform: "windows",
      architecture: "x64",
      channel: "stable",
      releaseNotesVi: "notes",
      releaseNotesEn: null,
    });

    expect(result.created).toBe(false);
    expect(result.announcement.publicId).toBe("ann_existing");
    expect(createDraft).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
