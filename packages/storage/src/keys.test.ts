import { describe, expect, it } from "vitest";
import { createObjectKey, sanitizeClientFilename } from "./keys";

describe("createObjectKey", () => {
  it("generates keys under namespace with safe extension", () => {
    const key = createObjectKey({ namespace: "blog", extension: "webp", visibility: "public" });
    expect(key).toMatch(/^pub\/blog\/[a-f0-9]{32}\.webp$/);
  });

  it("uses private prefix for private visibility", () => {
    const key = createObjectKey({ namespace: "releases", extension: "zip", visibility: "private" });
    expect(key.startsWith("prv/releases/")).toBe(true);
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
