import { describe, expect, it } from "vitest";
import { CatalogError } from "../product/admin";
import { AnnouncementService } from "./service";

const announcementRow = {
  id: "ann-1",
  publicId: "ann_test",
  productId: null,
  severity: "info" as const,
  status: "draft" as const,
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

describe("AnnouncementService.publish", () => {
  it("fails when default locale translation is missing", async () => {
    let selectCall = 0;
    const db = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCall += 1;
            if (selectCall === 1) {
              return { limit: async () => [announcementRow] };
            }
            return Promise.resolve([
              {
                id: "tr-1",
                announcementId: announcementRow.id,
                locale: "en",
                title: "English only",
                body: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]);
          },
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    await expect(service.publish(announcementRow.id)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: expect.stringMatching(/locale mặc định/i),
    } satisfies Partial<CatalogError>);
  });
});
