"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { getMediaService } from "@/lib/media-service";
import { hasPermission } from "@khepree/security";
import type { AdminMediaFilter } from "@khepree/db";

export type MediaUploadState = ActionState & {
  uploadUrl?: string;
  objectKey?: string;
  uploadHeaders?: Record<string, string>;
  bucket?: "public" | "private";
};

async function actor() {
  const session = await requireAdmin("content.write");
  if (!hasPermission({ globalRole: session.globalRole }, "content.write")) {
    throw new Error("Forbidden");
  }
  return session;
}

function fail(error: unknown): ActionState {
  if (error instanceof Error) return { error: error.message };
  return { error: "Unexpected error" };
}

export async function prepareMediaLibraryUploadAction(
  _s: MediaUploadState,
  formData: FormData,
): Promise<MediaUploadState> {
  try {
    const session = await actor();
    const mimeType = String(formData.get("mimeType") ?? "");
    const sizeBytes = Number(formData.get("sizeBytes") ?? 0);
    const visibility = String(formData.get("visibility") ?? "public") as "public" | "private";
    const namespace = String(formData.get("namespace") ?? "marketing");
    const context = String(formData.get("context") ?? "") || null;
    const contentClass = String(formData.get("contentClass") ?? "") || undefined;

    const result = await getMediaService().prepareUpload({
      mimeType,
      sizeBytes,
      visibility,
      namespace,
      context,
      ownerType: "user",
      ownerId: session.user.id,
      contentClass: contentClass as "marketing_raster" | "software_release" | undefined,
    });

    return {
      objectKey: result.objectKey,
      uploadUrl: result.upload.url,
      uploadHeaders: result.upload.headers,
      bucket: result.bucket,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function completeMediaLibraryUploadAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor();
    const contentClassRaw = String(formData.get("contentClass") ?? "");
    const contentClass =
      contentClassRaw === "marketing_raster" || contentClassRaw === "software_release"
        ? contentClassRaw
        : undefined;

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
      contentClass,
    });
    revalidatePath("/media");
    revalidatePath(`/media/${record.publicId}`);
    return { notice: `Đã tải lên: ${record.publicId}` };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMediaAltAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor();
    const publicId = String(formData.get("publicId") ?? "");
    await getMediaService().updateAltText(publicId, String(formData.get("altText") ?? "") || null);
    revalidatePath("/media");
    revalidatePath(`/media/${publicId}`);
    return { notice: "Đã cập nhật alt text" };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMediaAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor();
    const publicId = String(formData.get("publicId") ?? "");
    if (String(formData.get("confirm") ?? "") !== "CONFIRM") {
      return { error: "Nhập CONFIRM để xóa" };
    }
    await getMediaService().deleteIfUnreferenced(publicId);
    revalidatePath("/media");
    return { notice: "Đã xóa media" };
  } catch (error) {
    return fail(error);
  }
}

export type { AdminMediaFilter };
