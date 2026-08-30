import { describe, expect, it } from "vitest";
import { MockObjectStorage } from "@khepree/storage";
import { MediaService } from "./service";

describe("MediaService.prepareUpload", () => {
  it("returns presigned upload for valid public image", async () => {
    const service = new MediaService({} as never, new MockObjectStorage());
    const result = await service.prepareUpload({
      mimeType: "image/webp",
      sizeBytes: 4096,
      visibility: "public",
      namespace: "marketing",
    });

    expect(result.objectKey).toMatch(/^pub\/marketing\//);
    expect(result.upload.url).toContain("mock://upload/public/");
  });

  it("embeds owner in the object key", async () => {
    const service = new MediaService({} as never, new MockObjectStorage());
    const result = await service.prepareUpload({
      mimeType: "image/webp",
      sizeBytes: 4096,
      visibility: "private",
      namespace: "releases",
      ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    expect(result.objectKey).toContain("/aaaaaaaabbbbccccddddeeeeeeeeeeee/");
    expect(result.upload.headers["Content-Length"]).toBe("4096");
  });

  it("includes x-amz-acl on public presigned uploads", async () => {
    const service = new MediaService({} as never, new MockObjectStorage());
    const result = await service.prepareUpload({
      mimeType: "image/webp",
      sizeBytes: 4096,
      visibility: "public",
      namespace: "media",
      pathPrefix: "media",
    });
    expect(result.upload.headers["x-amz-acl"]).toBe("public-read");
  });

  it("uses canonical pathPrefix for public media library uploads", async () => {
    const service = new MediaService({} as never, new MockObjectStorage());
    const result = await service.prepareUpload({
      mimeType: "image/webp",
      sizeBytes: 4096,
      visibility: "public",
      namespace: "media",
      pathPrefix: "media",
    });
    expect(result.objectKey).toMatch(/^pub\/media\/[a-f0-9]{32}\.webp$/);
  });
});

describe("MediaService.completeUpload validation", () => {
  it("requires alt text for public raster images", async () => {
    const publicStorage = new MockObjectStorage();
    const privateStorage = new MockObjectStorage();
    const objectKey = "pub/marketing/test.webp";
    await publicStorage.putObject({
      key: objectKey,
      bucket: "public",
      contentType: "image/webp",
      body: Buffer.alloc(100),
    });

    const service = new MediaService(
      {
        insert: () => ({
          values: () => ({ returning: async () => [{}] }),
        }),
      } as never,
      publicStorage,
      privateStorage,
    );

    await expect(
      service.completeUpload({
        objectKey,
        bucket: "public",
        mimeType: "image/webp",
        expectedSizeBytes: 100,
      }),
    ).rejects.toThrow(/alt text/i);
  });

  it("rejects full URL object keys", async () => {
    const service = new MediaService({} as never, new MockObjectStorage(), new MockObjectStorage());
    await expect(
      service.completeUpload({
        objectKey: "https://vietnix.example/khepree-public/media/file.webp",
        bucket: "public",
        mimeType: "image/webp",
        expectedSizeBytes: 100,
        altText: "Test",
      }),
    ).rejects.toThrow(/canonical storage key/);
  });
});
