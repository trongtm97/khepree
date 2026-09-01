import { describe, expect, it } from "vitest";
import {
  productImageCropNoticeVi,
  productImageNeedsCropNotice,
  PRODUCT_IMAGE_SPECS,
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
});
