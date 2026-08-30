import { describe, expect, it } from "vitest";
import { MockObjectStorage } from "@khepree/storage";
import { bodyObjectKeyFor, createContentService, sha256Hex } from "./service";

describe("ContentService body storage", () => {
  it("stores markdown in private object storage with checksum metadata", async () => {
    const storage = new MockObjectStorage();
    const body = "# Hello\n\nWorld";
    const key = bodyObjectKeyFor("entry-1", "vi", 1);

    await storage.putObject({
      key,
      body,
      contentType: "text/markdown; charset=utf-8",
      bucket: "private",
    });

    const stored = await storage.getObject(key, "private");
    expect(stored?.toString("utf8")).toBe(body);
    expect(sha256Hex(body)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps published version keys immutable across version numbers", () => {
    expect(bodyObjectKeyFor("e1", "vi", 1)).not.toBe(bodyObjectKeyFor("e1", "vi", 2));
  });
});

describe("createContentService getBody", () => {
  it("reads body bytes from storage by object key", async () => {
    const storage = new MockObjectStorage();
    const key = bodyObjectKeyFor("entry-1", "en", 1);
    await storage.putObject({
      key,
      body: "Draft body",
      contentType: "text/markdown; charset=utf-8",
      bucket: "private",
    });

    const service = createContentService(undefined, storage);
    await expect(service.getBody({ bodyObjectKey: key })).resolves.toBe("Draft body");
  });
});
