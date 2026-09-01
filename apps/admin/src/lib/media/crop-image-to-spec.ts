import { computeCentreCoverCrop, productImageSpec, type ProductImageSlot } from "@khepree/catalog/product/image-specs";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Không đọc được ảnh"));
    el.src = url;
  });
}

/** Crop + encode WebP client-side to match product studio spec (avoids server Sharp / body limits). */
export async function cropFileToProductSpec(file: File, slot: ProductImageSlot): Promise<File> {
  const spec = productImageSpec(slot);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas không khả dụng");

    const { sx, sy, sw, sh } = computeCentreCoverCrop(
      img.naturalWidth,
      img.naturalHeight,
      spec.width,
      spec.height,
    );
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, spec.width, spec.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh WebP"))),
        "image/webp",
        0.85,
      );
    });
    return new File([blob], `product-${slot}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
