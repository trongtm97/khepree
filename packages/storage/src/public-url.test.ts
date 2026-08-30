import { describe, expect, it } from "vitest";
import { assertHttpsPublicBaseUrl, buildPublicObjectUrl, isAbsoluteHttpUrl } from "./public-url";

describe("buildPublicObjectUrl", () => {
  it("joins CDN base URL and canonical object key", () => {
    expect(buildPublicObjectUrl("https://cdn.khepree.com", "products/studio/hero.webp")).toBe(
      "https://cdn.khepree.com/products/studio/hero.webp",
    );
  });

  it("does not double-prefix slashes", () => {
    expect(buildPublicObjectUrl("https://cdn.khepree.com/", "/media/file.webp")).toBe(
      "https://cdn.khepree.com/media/file.webp",
    );
  });

  it("encodes unsafe path segments", () => {
    expect(buildPublicObjectUrl("https://cdn.example.com", "media/a b.webp")).toBe(
      "https://cdn.example.com/media/a%20b.webp",
    );
  });
});

describe("assertHttpsPublicBaseUrl", () => {
  it("accepts https origins", () => {
    expect(() => assertHttpsPublicBaseUrl("https://cdn.khepree.com")).not.toThrow();
  });

  it("rejects http origins", () => {
    expect(() => assertHttpsPublicBaseUrl("http://cdn.khepree.com")).toThrow(/HTTPS/);
  });
});

describe("isAbsoluteHttpUrl", () => {
  it("detects absolute URLs unsuitable for object keys", () => {
    expect(isAbsoluteHttpUrl("https://vietnix.example/bucket/key")).toBe(true);
    expect(isAbsoluteHttpUrl("products/slug/file.webp")).toBe(false);
  });
});
