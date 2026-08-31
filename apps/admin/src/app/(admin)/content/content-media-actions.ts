"use server";

import { listAdminMedia } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { requireAdmin } from "@/lib/admin-session";
import { getMediaService } from "@/lib/media-service";

export type EditorMediaImage = {
  publicId: string;
  url: string;
  altText: string;
};

async function actor() {
  const session = await requireAdmin("content.write");
  if (!hasPermission({ globalRole: session.globalRole }, "content.write")) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function completeEditorMediaUploadAction(
  formData: FormData,
): Promise<{ ok: true; publicId: string; url: string } | { ok: false; message: string }> {
  try {
    const session = await actor();
    const record = await getMediaService().completeUpload({
      objectKey: String(formData.get("objectKey") ?? ""),
      bucket: String(formData.get("bucket") ?? "public") as "public" | "private",
      mimeType: String(formData.get("mimeType") ?? ""),
      expectedSizeBytes: Number(formData.get("sizeBytes") ?? 0),
      altText: String(formData.get("altText") ?? "") || null,
      context: String(formData.get("context") ?? "") || null,
      ownerType: "user",
      ownerId: session.user.id,
      width: Number(formData.get("width") ?? 0) || null,
      height: Number(formData.get("height") ?? 0) || null,
      checksumSha256: String(formData.get("checksumSha256") ?? "") || null,
    });
    if (!record.publicUrl) {
      return { ok: false, message: "Ảnh public không có URL." };
    }
    return { ok: true, publicId: record.publicId, url: record.publicUrl };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Upload thất bại." };
  }
}

export async function listEditorMediaImagesAction(): Promise<EditorMediaImage[]> {
  const session = await requireAdmin("content.read");
  if (!hasPermission({ globalRole: session.globalRole }, "content.read")) {
    return [];
  }

  const rows = await listAdminMedia({ filter: "images", page: 1 });
  const service = getMediaService();
  const images: EditorMediaImage[] = [];

  for (const row of rows) {
    if (row.visibility !== "public" || !row.mimeType.startsWith("image/")) continue;
    const media = await service.getByPublicId(row.publicId);
    if (!media?.publicUrl) continue;
    images.push({
      publicId: media.publicId,
      url: media.publicUrl,
      altText: media.altText?.trim() || "",
    });
    if (images.length >= 24) break;
  }

  return images;
}

export async function resolveMediaPublicUrlAction(
  publicId: string,
): Promise<{ url: string | null; altText: string }> {
  await requireAdmin("content.read");
  const trimmed = publicId.trim();
  if (!trimmed) return { url: null, altText: "" };
  const media = await getMediaService().getByPublicId(trimmed);
  return { url: media?.publicUrl ?? null, altText: media?.altText?.trim() || "" };
}
