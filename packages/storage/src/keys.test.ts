import { describe, expect, it } from "vitest";
import { createObjectKey, sanitizeClientFilename } from "./keys";

describe("createObjectKey", () => {
  it("generates keys under namespace with safe extension", () => {
    const key = createObjectKey({ namespace: "blog", extension: "webp", visibility: "public" });
    expect(key).toMatch(/^pub\/blog\/[a-f0-9]{32}\.webp$/);
  });

  it("uses canonical pathPrefix without pub segment", () => {
    const key = createObjectKey({
      pathPrefix: "products/studio",
      namespace: "marketing",
      extension: "webp",
      visibility: "public",
    });
    expect(key).toMatch(/^pub\/products\/studio\/[a-f0-9]{32}\.webp$/);
  });

  it("uses private prefix for private visibility", () => {
    const key = createObjectKey({ namespace: "releases", extension: "zip", visibility: "private" });
    expect(key.startsWith("prv/releases/")).toBe(true);
  });

  it("embeds owner segment when ownerId is set", () => {
    const ownerId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const key = createObjectKey({
      namespace: "releases",
      extension: "zip",
      visibility: "private",
      ownerId,
    });
    expect(key).toMatch(/^prv\/releases\/aaaaaaaabbbbccccddddeeeeeeeeeeee\/[a-f0-9]{32}\.zip$/);
  });

  it("rejects unsafe namespace", () => {
    expect(() => createObjectKey({ namespace: "../evil", extension: "jpg", visibility: "public" })).toThrow();
  });
});

describe("sanitizeClientFilename", () => {
  it("strips path segments", () => {
    expect(sanitizeClientFilename("../../secret.exe")).toBe("secret.exe");
  });
});
