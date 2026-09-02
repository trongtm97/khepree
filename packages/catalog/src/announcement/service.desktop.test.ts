import { describe, expect, it } from "vitest";
import { AnnouncementService } from "./service";

const PRODUCT_A = "11111111-1111-4111-8111-111111111111";
const PRODUCT_B = "22222222-2222-4222-8222-222222222222";
const USER_ID = "user-1";

function publishedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ann-1",
    publicId: "ann_test",
    productId: PRODUCT_A,
    severity: "info" as const,
    status: "published" as const,
    targetPlatform: "windows" as const,
    targetArchitecture: "x64" as const,
    releaseChannel: "stable" as const,
    minimumAppVersion: null,
    maximumAppVersion: null,
    startsAt: null,
    expiresAt: null,
    publishedAt: new Date("2026-09-03T08:00:00.000Z"),
    ctaKind: "none" as const,
    ctaPayload: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const desktopContext = {
  productId: PRODUCT_A,
  appVersion: "2.0.0",
  platform: "windows" as const,
  architecture: "x64" as const,
  channel: "stable" as const,
};

describe("AnnouncementService.listForDesktop", () => {
  it("scopes announcements to the bound product", async () => {
    const rowA = publishedRow({ id: "a", publicId: "ann_a" });
    const rowB = publishedRow({ id: "b", publicId: "ann_b", productId: PRODUCT_B });
    let insertCalls = 0;
    let selectCall = 0;

    const db = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCall += 1;
            if (selectCall === 1) {
              return { orderBy: async () => [rowA, rowB] };
            }
            if (selectCall === 2) {
              return Promise.resolve([
                { announcementId: "a", locale: "vi", title: "Thông báo A", body: null },
              ]);
            }
            return Promise.resolve([]);
          },
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => {
            insertCalls += 1;
            return Promise.resolve();
          },
        }),
      }),
    };

    const service = new AnnouncementService(db as never, { record: async () => {} });
    const page = await service.listForDesktop({
      userId: USER_ID,
      productId: PRODUCT_A,
      appVersion: "2.0.0",
      platform: "windows",
      architecture: "x64",
      channel: "stable",
      locale: "vi",
    });

    expect(page.items.map((item) => item.publicId)).toEqual(["ann_a"]);
    expect(insertCalls).toBe(1);
  });

  it("rejects malformed cursor and appVersion", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => [],
          }),
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    await expect(
      service.listForDesktop({
        userId: USER_ID,
        productId: PRODUCT_A,
        appVersion: "not-semver",
        platform: "windows",
        architecture: "x64",
        channel: "stable",
        locale: "vi",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    await expect(
      service.listForDesktop({
        userId: USER_ID,
        productId: PRODUCT_A,
        appVersion: "2.0.0",
        platform: "windows",
        architecture: "x64",
        channel: "stable",
        locale: "vi",
        cursor: "not-valid",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("AnnouncementService markRead/dismiss", () => {
  it("rejects read when announcement was never delivered", async () => {
    const announcement = publishedRow();
    let selectCall = 0;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCall += 1;
              if (selectCall === 1 || selectCall === 2) return [announcement];
              return [{ announcementId: announcement.id, userId: USER_ID, firstDeliveredAt: null }];
            },
          }),
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    await expect(
      service.markRead({
        announcementPublicId: announcement.publicId,
        userId: USER_ID,
        context: desktopContext,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("markRead is idempotent and preserves first readAt", async () => {
    const announcement = publishedRow();
    const existingReadAt = new Date("2026-09-03T09:00:00.000Z");
    let selectCall = 0;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCall += 1;
              if (selectCall <= 2) return [announcement];
              return [
                {
                  announcementId: announcement.id,
                  userId: USER_ID,
                  firstDeliveredAt: new Date("2026-09-03T08:30:00.000Z"),
                  readAt: null,
                  dismissedAt: null,
                },
              ];
            },
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: async () => [{ readAt: existingReadAt }],
          }),
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    const result = await service.markRead({
      announcementPublicId: announcement.publicId,
      userId: USER_ID,
      context: desktopContext,
    });

    expect(result.readAt).toEqual(existingReadAt);
  });

  it("dismiss is idempotent and preserves first dismissedAt", async () => {
    const announcement = publishedRow();
    const existingDismissedAt = new Date("2026-09-03T10:00:00.000Z");
    let selectCall = 0;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCall += 1;
              if (selectCall <= 2) return [announcement];
              return [
                {
                  announcementId: announcement.id,
                  userId: USER_ID,
                  firstDeliveredAt: new Date("2026-09-03T08:30:00.000Z"),
                  readAt: null,
                  dismissedAt: null,
                },
              ];
            },
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: async () => [
              { readAt: null, dismissedAt: existingDismissedAt },
            ],
          }),
        }),
      }),
    };
    const service = new AnnouncementService(db as never, { record: async () => {} });

    const result = await service.dismiss({
      announcementPublicId: announcement.publicId,
      userId: USER_ID,
      context: desktopContext,
    });

    expect(result.dismissedAt).toEqual(existingDismissedAt);
  });
});
