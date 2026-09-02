import { describe, expect, it } from "vitest";
import { AnnouncementService } from "./service";

const publishedRow = {
  id: "ann-1",
  publicId: "ann_pub",
  productId: null,
  severity: "info" as const,
  status: "published" as const,
  targetPlatform: null,
  targetArchitecture: null,
  releaseChannel: null,
  minimumAppVersion: null,
  maximumAppVersion: null,
  startsAt: null,
  expiresAt: null,
  publishedAt: new Date(),
  ctaKind: "none" as const,
  ctaPayload: null,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AnnouncementService admin guards", () => {
  it("blocks updateDraft on published announcements", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [publishedRow],
          }),
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    await expect(
      service.updateDraft({
        announcementId: publishedRow.id,
        translations: [{ locale: "vi", title: "Mới", body: null }],
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: expect.stringMatching(/draft/i),
    });
  });

  it("clonePublishedToDraft rejects non-published rows", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ ...publishedRow, status: "draft" as const }],
          }),
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    await expect(service.clonePublishedToDraft(publishedRow.id)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });
});
