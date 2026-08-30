import { describe, expect, it } from "vitest";
import { validateUpload, UploadValidationError } from "@khepree/storage";

describe("software release storage policy", () => {
  it("rejects public software_release uploads", () => {
    expect(() =>
      validateUpload({
        mimeType: "application/zip",
        sizeBytes: 1024,
        bucket: "public",
        contentClass: "software_release",
      }),
    ).toThrow(UploadValidationError);
  });

  it("requires checksum for private software releases when flagged", () => {
    expect(() =>
      validateUpload({
        mimeType: "application/zip",
        sizeBytes: 1024,
        bucket: "private",
        contentClass: "software_release",
        requireChecksum: true,
      }),
    ).toThrow(/checksum/i);
  });

  it("accepts private release with checksum", () => {
    expect(() =>
      validateUpload({
        mimeType: "application/zip",
        sizeBytes: 1024,
        bucket: "private",
        contentClass: "software_release",
        requireChecksum: true,
        checksumSha256: "a".repeat(64),
      }),
    ).not.toThrow();
  });
});
