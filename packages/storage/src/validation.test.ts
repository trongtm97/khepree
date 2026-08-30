import { describe, expect, it } from "vitest";
import { extensionForMime, validateUpload, UploadValidationError } from "./validation";

describe("validateUpload", () => {
  it("allows public images within size limit", () => {
    expect(() =>
      validateUpload({ mimeType: "image/png", sizeBytes: 1024, bucket: "public" }),
    ).not.toThrow();
  });

  it("rejects oversize public upload", () => {
    expect(() =>
      validateUpload({ mimeType: "image/png", sizeBytes: 20 * 1024 * 1024, bucket: "public" }),
    ).toThrow(UploadValidationError);
  });

  it("rejects disallowed mime on public bucket", () => {
    expect(() =>
      validateUpload({ mimeType: "application/zip", sizeBytes: 1024, bucket: "public" }),
    ).toThrow(UploadValidationError);
  });

  it("allows private installers", () => {
    expect(() =>
      validateUpload({ mimeType: "application/zip", sizeBytes: 50 * 1024 * 1024, bucket: "private" }),
    ).not.toThrow();
  });

  it("requires checksum for software releases on complete", () => {
    expect(() =>
      validateUpload({
        mimeType: "application/zip",
        sizeBytes: 1024,
        bucket: "private",
        requireChecksum: true,
      }),
    ).toThrow(/checksum/);
  });

  it("rejects declared PNG that sniffs as JPEG", () => {
    expect(() =>
      validateUpload({
        mimeType: "image/png",
        sizeBytes: 3,
        bucket: "public",
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
    ).toThrow(/does not match file contents/);
  });
});

describe("extensionForMime", () => {
  it("maps known mime types", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("application/pdf")).toBe("pdf");
  });
});
