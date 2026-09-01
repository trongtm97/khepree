import { describe, expect, it } from "vitest";
import {
  productImageCropNoticeVi,
  productImageNeedsCropNotice,
  PRODUCT_IMAGE_SPECS,
  computeCentreCoverCrop,
} from "./image-specs";

describe("product image specs", () => {
  it("defines slots aligned with web layout", () => {
    expect(PRODUCT_IMAGE_SPECS.cover.width / PRODUCT_IMAGE_SPECS.cover.height).toBeCloseTo(16 / 9);
    expect(PRODUCT_IMAGE_SPECS.gallery.width / PRODUCT_IMAGE_SPECS.gallery.height).toBeCloseTo(
      16 / 9,
    );
    expect(PRODUCT_IMAGE_SPECS.icon.width).toBe(PRODUCT_IMAGE_SPECS.icon.height);
  });

  it("detects aspect mismatch for crop notice", () => {
    expect(productImageNeedsCropNotice("cover", 1600, 1000)).toBe(true);
    expect(productImageNeedsCropNotice("cover", 1920, 1080)).toBe(false);
    expect(productImageCropNoticeVi("cover", 1600, 1000)).toContain("16:9");
  });

  it("computes centre cover crop for wide sources", () => {
    const crop = computeCentreCoverCrop(1920, 1080, 1920, 1080);
    expect(crop.sw).toBe(1920);
    expect(crop.sh).toBe(1080);
    expect(crop.sx).toBe(0);
  });

  it("computes centre cover crop for tall sources", () => {
    const crop = computeCentreCoverCrop(1000, 1000, 512, 512);
    expect(crop.sw).toBe(1000);
    expect(crop.sh).toBe(1000);
    expect(crop.sy).toBe(0);
  });
});
