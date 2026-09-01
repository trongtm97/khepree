import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertHttpsPublicBaseUrl,
  buildPublicObjectUrl,
  isAbsoluteHttpUrl,
  resolvePublicBrowserBaseUrl,
} from "./public-url";

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

describe("resolvePublicBrowserBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses WEB_URL when public ACL mode is none", () => {
    vi.stubEnv("WEB_URL", "https://khepree.com/");
    expect(resolvePublicBrowserBaseUrl("https://cdn.khepree.com", "none")).toBe("https://khepree.com");
  });

  it("keeps CDN base when ACL mode is active", () => {
    vi.stubEnv("WEB_URL", "https://khepree.com");
    expect(resolvePublicBrowserBaseUrl("https://cdn.khepree.com", "acl")).toBe("https://cdn.khepree.com");
  });
});
