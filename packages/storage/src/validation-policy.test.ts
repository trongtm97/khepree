import { describe, expect, it } from "vitest";
import { validateUpload, UploadValidationError } from "./validation";

describe("public upload SVG policy", () => {
  it("rejects SVG on public bucket", () => {
    expect(() =>
      validateUpload({ mimeType: "image/svg+xml", sizeBytes: 1024, bucket: "public" }),
    ).toThrow(UploadValidationError);
  });

  it("allows webp on public bucket", () => {
    expect(() =>
      validateUpload({ mimeType: "image/webp", sizeBytes: 1024, bucket: "public" }),
    ).not.toThrow();
  });
});
