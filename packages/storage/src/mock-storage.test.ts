import { describe, expect, it } from "vitest";
import { MockObjectStorage } from "./mock-storage";

describe("MockObjectStorage", () => {
  it("put/get/head roundtrip", async () => {
    const storage = new MockObjectStorage();
    await storage.putObject({
      key: "pub/blog/test.webp",
      body: Buffer.from("hello"),
      contentType: "image/webp",
      bucket: "public",
    });

    const head = await storage.headObject("pub/blog/test.webp", "public");
    expect(head?.contentLength).toBe(5);

    const body = await storage.getObject("pub/blog/test.webp", "public");
    expect(body?.toString()).toBe("hello");
  });

  it("creates presigned upload and download URLs", async () => {
    const storage = new MockObjectStorage();
    const upload = await storage.createPresignedUpload({
      key: "prv/releases/app.zip",
      contentType: "application/zip",
      bucket: "private",
    });
    expect(upload.url).toContain("mock://upload/private/");

    const download = await storage.createPresignedDownload({
      key: "prv/releases/app.zip",
      bucket: "private",
      expiresInSeconds: 60,
    });
    expect(download.url).toContain("mock://download/private/");
  });

  it("delete removes object", async () => {
    const storage = new MockObjectStorage();
    await storage.putObject({
      key: "x",
      body: "a",
      contentType: "text/plain",
      bucket: "public",
    });
    await storage.deleteObject("x", "public");
    expect(await storage.getObject("x", "public")).toBeNull();
  });
});
