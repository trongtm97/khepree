import { describe, expect, it } from "vitest";
import { MockObjectStorage } from "@khepree/storage";
import {
  defaultDownloadAccessPolicy,
  DownloadService,
} from "../download/service";
import type { MediaRecord } from "../content/types";

function privateMedia(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: "id",
    publicId: "med_test",
    storageProvider: "mock",
    bucket: "private",
    objectKey: "prv/test/file.webp",
    mimeType: "image/webp",
    sizeBytes: 100,
    checksumSha256: null,
    width: null,
    height: null,
    visibility: "private",
    altText: null,
    ownerType: null,
    ownerId: null,
    context: null,
    publicUrl: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("defaultDownloadAccessPolicy", () => {
  it("denies private media by default", () => {
    expect(
      defaultDownloadAccessPolicy.canDownloadPrivateMedia(
        privateMedia({ ownerType: "user", ownerId: "other-user" }),
        { purpose: "preview", actorUserId: "user-1" },
      ),
    ).toBe(false);
  });

  it("allows when user owner matches actor", () => {
    expect(
      defaultDownloadAccessPolicy.canDownloadPrivateMedia(
        privateMedia({ ownerType: "user", ownerId: "user-1" }),
        { purpose: "preview", actorUserId: "user-1" },
      ),
    ).toBe(true);
  });

  it("allows ownerless private media in test env", () => {
    expect(
      defaultDownloadAccessPolicy.canDownloadPrivateMedia(privateMedia(), {
        purpose: "dev",
      }),
    ).toBe(true);
  });

  it("allows admin-authorized private downloads", () => {
    expect(
      defaultDownloadAccessPolicy.canDownloadPrivateMedia(
        privateMedia({ ownerType: "user", ownerId: "other-user" }),
        { purpose: "admin", actorUserId: "staff-1", adminAuthorized: true },
      ),
    ).toBe(true);
  });

  it("requires entitlement for product-bound private media", () => {
    const media = privateMedia({
      ownerType: "user",
      ownerId: "user-1",
      context: "product:prod_sample",
    });
    expect(
      defaultDownloadAccessPolicy.canDownloadPrivateMedia(media, {
        purpose: "download",
        actorUserId: "user-1",
      }),
    ).toBe(false);
    expect(
      defaultDownloadAccessPolicy.canDownloadPrivateMedia(media, {
        purpose: "download",
        actorUserId: "user-1",
        entitled: true,
      }),
    ).toBe(true);
  });
});

describe("DownloadService.authorizePrivateDownload", () => {
  it("returns presigned URL when policy allows", async () => {
    const service = new DownloadService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [
                {
                  id: "id",
                  publicId: "med_test",
                  storageProvider: "mock",
                  bucket: "private",
                  objectKey: "prv/test/file.webp",
                  mimeType: "image/webp",
                  sizeBytes: 100,
                  checksumSha256: null,
                  width: null,
                  height: null,
                  visibility: "private",
                  altText: null,
                  ownerType: null,
                  ownerId: null,
                  context: null,
                  createdAt: new Date(),
                },
              ],
            }),
          }),
        }),
      } as never,
      new MockObjectStorage(),
    );

    const download = await service.authorizePrivateDownload({
      mediaPublicId: "med_test",
      context: { purpose: "dev" },
    });

    expect(download.url).toContain("mock://download/private/");
    expect(download.expiresAt).toBeInstanceOf(Date);
  });
});
