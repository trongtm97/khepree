import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { isRasterImageMime, processRasterToWebp } from "./process-raster-image";

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
