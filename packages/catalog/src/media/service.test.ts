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
});
