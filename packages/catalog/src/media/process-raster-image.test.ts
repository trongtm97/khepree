import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { isRasterImageMime, processRasterToWebp, processRasterToWebpCropped } from "./process-raster-image";

describe("processRasterToWebp", () => {
  it("converts PNG input to WebP", async () => {
    const png = await sharp({
      create: { width: 800, height: 400, channels: 3, background: { r: 10, g: 120, b: 200 } },
    })
      .png()
      .toBuffer();

    const result = await processRasterToWebp(png);
    expect(result.mimeType).toBe("image/webp");
    expect(result.width).toBe(800);
    expect(result.height).toBe(400);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it("detects raster mime types", () => {
    expect(isRasterImageMime("image/jpeg")).toBe(true);
    expect(isRasterImageMime("application/pdf")).toBe(false);
  });
});

describe("processRasterToWebpCropped", () => {
  it("crops landscape source to 16:9 cover dimensions", async () => {
    const png = await sharp({
      create: { width: 1600, height: 900, channels: 3, background: { r: 40, g: 80, b: 120 } },
    })
      .png()
      .toBuffer();

    const result = await processRasterToWebpCropped(png, { width: 1920, height: 1080 });
    expect(result.mimeType).toBe("image/webp");
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it("crops to square icon size", async () => {
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .png()
      .toBuffer();

    const result = await processRasterToWebpCropped(png, { width: 512, height: 512 });
    expect(result.width).toBe(512);
    expect(result.height).toBe(512);
  });
});
