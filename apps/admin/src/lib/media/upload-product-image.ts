"use client";

import { productImageSpec, type ProductImageSlot } from "@khepree/catalog/product/image-specs";
import { uploadCroppedProductImageAction } from "@/app/(admin)/products/product-media-actions";
import { cropFileToProductSpec } from "@/lib/media/crop-image-to-spec";
import { uploadViaPresignedPublic } from "@/lib/media/presigned-public-upload";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProductImageUploadClientResult =
  | { ok: true; publicId: string; url: string; width: number; height: number }
  | { ok: false; message: string };

async function uploadCroppedViaServer(
  cropped: File,
  input: { slot: ProductImageSlot; productId: string; altText: string },
  spec: ReturnType<typeof productImageSpec>,
): Promise<ProductImageUploadClientResult> {
  const fallback = new FormData();
  fallback.set("file", cropped);
  fallback.set("slot", input.slot);
  fallback.set("productId", input.productId);
  fallback.set("altText", input.altText);

  const result = await uploadCroppedProductImageAction(fallback);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return {
    ok: true,
    publicId: result.publicId,
    url: result.url,
    width: spec.width,
    height: spec.height,
  };
}

export async function uploadProductImage(
  file: File,
  input: { slot: ProductImageSlot; productId: string; altText: string },
): Promise<ProductImageUploadClientResult> {
  if (!ACCEPTED.has(file.type)) {
    return { ok: false, message: "Chỉ hỗ trợ JPG, PNG, WebP cho ảnh sản phẩm." };
  }

  const spec = productImageSpec(input.slot);
  const altText = input.altText.trim() || spec.labelVi;
  const context = `product:${input.productId}`;

  try {
    const cropped = await cropFileToProductSpec(file, input.slot);

    const presigned = await uploadViaPresignedPublic({
      file: cropped,
      mimeType: cropped.type,
      sizeBytes: cropped.size,
      altText,
      context,
      contentClass: "marketing_raster",
      width: spec.width,
      height: spec.height,
    });

    if (!presigned.ok) {
      if (presigned.networkError) {
        return await uploadCroppedViaServer(cropped, input, spec);
      }
      return { ok: false, message: presigned.message };
    }

    return {
      ok: true,
      publicId: presigned.publicId,
      url: presigned.url,
      width: spec.width,
      height: spec.height,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upload thất bại.",
    };
  }
}
