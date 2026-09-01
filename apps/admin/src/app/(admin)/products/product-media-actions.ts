"use server";

import {
  processProductImageUpload,
  type ProductImageSlot,
  PRODUCT_IMAGE_SPECS,
  RASTER_MAX_INPUT_BYTES,
  isRasterImageMime,
} from "@khepree/catalog";
import { hasPermission } from "@khepree/security";
import { requireAdmin } from "@/lib/admin-session";
import { getMediaService } from "@/lib/media-service";

export type ProductImageUploadResult =
  | { ok: true; publicId: string; url: string; width: number; height: number }
  | { ok: false; message: string };

async function actor() {
  const session = await requireAdmin("catalog.write");
  if (!hasPermission({ globalRole: session.globalRole }, "catalog.write")) {
    throw new Error("Forbidden");
  }
  return session;
}

function parseSlot(raw: string): ProductImageSlot | null {
  if (raw === "icon" || raw === "cover" || raw === "gallery") return raw;
  return null;
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<ProductImageUploadResult> {
  try {
    const session = await actor();
    const slot = parseSlot(String(formData.get("slot") ?? ""));
    const productId = String(formData.get("productId") ?? "").trim();
    const file = formData.get("file");

    if (!slot || !productId) {
      return { ok: false, message: "Thiếu loại ảnh hoặc sản phẩm." };
    }
    if (!file || !(file instanceof File)) {
      return { ok: false, message: "Chọn tệp ảnh." };
    }
    if (!isRasterImageMime(file.type)) {
      return { ok: false, message: "Chỉ hỗ trợ JPG, PNG, WebP cho ảnh sản phẩm." };
    }
    if (file.size > RASTER_MAX_INPUT_BYTES) {
      return { ok: false, message: "Ảnh quá lớn (tối đa 10MB)." };
    }

    const spec = PRODUCT_IMAGE_SPECS[slot];
    const altText = String(formData.get("altText") ?? spec.labelVi).trim() || spec.labelVi;
    const processed = await processProductImageUpload(Buffer.from(await file.arrayBuffer()), slot);

    const record = await getMediaService().uploadProcessedPublicRaster({
      body: processed.buffer,
      mimeType: processed.mimeType,
      sizeBytes: processed.sizeBytes,
      width: processed.width,
      height: processed.height,
      altText,
      context: `product:${productId}`,
      ownerType: "user",
      ownerId: session.user.id,
    });

    if (!record.publicUrl) {
      return { ok: false, message: "Ảnh public không có URL." };
    }

    return {
      ok: true,
      publicId: record.publicId,
      url: record.publicUrl,
      width: processed.width,
      height: processed.height,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upload thất bại.",
    };
  }
}
