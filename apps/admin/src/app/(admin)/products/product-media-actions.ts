"use server";

import { productImageSpec, type ProductImageSlot } from "@khepree/catalog/product/image-specs";
import { hasPermission } from "@khepree/security";
import { requireAdmin } from "@/lib/admin-session";
import { getMediaService } from "@/lib/media-service";

const MAX_CROPPED_BYTES = 2 * 1024 * 1024;

export type CroppedProductImageUploadResult =
  | { ok: true; publicId: string; url: string; width: number; height: number }
  | { ok: false; message: string };

/** Server-side put for client-cropped WebP (small) when browser presigned PUT fails (CORS). */
export async function uploadCroppedProductImageAction(
  formData: FormData,
): Promise<CroppedProductImageUploadResult> {
  try {
    const session = await requireAdmin("content.write");
    if (!hasPermission({ globalRole: session.globalRole }, "content.write")) {
      return { ok: false, message: "Forbidden" };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, message: "Không có file ảnh." };
    }
    if (file.type !== "image/webp") {
      return { ok: false, message: "Ảnh crop phải là WebP." };
    }
    if (file.size > MAX_CROPPED_BYTES) {
      return { ok: false, message: "Ảnh crop quá lớn (tối đa 2MB)." };
    }

    const slot = String(formData.get("slot") ?? "") as ProductImageSlot;
    if (slot !== "icon" && slot !== "cover" && slot !== "gallery") {
      return { ok: false, message: "Slot ảnh không hợp lệ." };
    }

    const productId = String(formData.get("productId") ?? "").trim();
    if (!productId) {
      return { ok: false, message: "Thiếu productId." };
    }

    const spec = productImageSpec(slot);
    const altText =
      String(formData.get("altText") ?? "").trim() || spec.labelVi;
    const context = `product:${productId}`;
    const body = Buffer.from(await file.arrayBuffer());

    const record = await getMediaService().uploadProcessedPublicRaster({
      body,
      mimeType: "image/webp",
      sizeBytes: file.size,
      width: spec.width,
      height: spec.height,
      altText,
      context,
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
