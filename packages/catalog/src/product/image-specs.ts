/** Product media slots — aspect ratios match apps/web catalog components. */
export type ProductImageSlot = "icon" | "cover" | "gallery";

export type ProductImageSpec = {
  slot: ProductImageSlot;
  labelVi: string;
  width: number;
  height: number;
  /** CSS-style aspect label for UI, e.g. "16:10". */
  aspectLabel: string;
  hintVi: string;
};

export const PRODUCT_IMAGE_SPECS: Record<ProductImageSlot, ProductImageSpec> = {
  icon: {
    slot: "icon",
    labelVi: "Icon / Logo",
    width: 512,
    height: 512,
    aspectLabel: "1:1",
    hintVi:
      "Tỉ lệ 1:1 · khuyến nghị 512×512 px · JPG/PNG/WebP · nền trong suốt nếu là logo.",
  },
  cover: {
    slot: "cover",
    labelVi: "Cover / Hero",
    width: 1920,
    height: 1080,
    aspectLabel: "16:9",
    hintVi:
      "Tỉ lệ 16:9 · khuyến nghị 1920×1080 px · hiển thị hero sản phẩm trên website.",
  },
  gallery: {
    slot: "gallery",
    labelVi: "Gallery",
    width: 1920,
    height: 1080,
    aspectLabel: "16:9",
    hintVi:
      "Tỉ lệ 16:9 · khuyến nghị 1920×1080 px · lưới ảnh minh họa trên trang sản phẩm.",
  },
};

export function productImageSpec(slot: ProductImageSlot): ProductImageSpec {
  return PRODUCT_IMAGE_SPECS[slot];
}

export function productImageTargetAspect(slot: ProductImageSlot): number {
  const spec = PRODUCT_IMAGE_SPECS[slot];
  return spec.width / spec.height;
}

/** True when source aspect differs enough that center crop will remove visible edges. */
export function productImageNeedsCropNotice(
  slot: ProductImageSlot,
  width: number,
  height: number,
  tolerance = 0.08,
): boolean {
  if (width <= 0 || height <= 0) return false;
  const actual = width / height;
  const target = productImageTargetAspect(slot);
  return Math.abs(actual - target) / target > tolerance;
}

export function productImageCropNoticeVi(
  slot: ProductImageSlot,
  width: number,
  height: number,
): string {
  const spec = PRODUCT_IMAGE_SPECS[slot];
  return `Ảnh ${width}×${height} khác tỉ lệ ${spec.aspectLabel}. Sẽ crop từ giữa thành ${spec.width}×${spec.height} px trước khi tải lên.`;
}
