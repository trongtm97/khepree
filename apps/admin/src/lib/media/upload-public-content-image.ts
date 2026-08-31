"use client";

import {
  completeEditorMediaUploadAction,
} from "@/app/(admin)/content/content-media-actions";
import { prepareMediaLibraryUploadAction } from "@/app/(admin)/media/media-actions";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Invalid image"));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadPublicContentImage(
  file: File,
  input: { altText: string; context?: string },
): Promise<{ ok: true; publicId: string; url: string; altText: string } | { ok: false; message: string }> {
  if (!ACCEPTED.has(file.type)) {
    return { ok: false, message: "Chỉ hỗ trợ JPG, PNG, WebP, GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Ảnh quá lớn (tối đa 5MB)." };
  }
  const altText = input.altText.trim();
  if (!altText) {
    return { ok: false, message: "Alt text bắt buộc cho ảnh public." };
  }

  const prep = new FormData();
  prep.set("mimeType", file.type);
  prep.set("sizeBytes", String(file.size));
  prep.set("visibility", "public");
  prep.set("namespace", "media");
  prep.set("pathPrefix", "media");
  prep.set("context", input.context ?? "content:inline");

  const prepared = await prepareMediaLibraryUploadAction({}, prep);
  if (prepared.error || !prepared.uploadUrl || !prepared.objectKey) {
    return { ok: false, message: prepared.error ?? "Không thể chuẩn bị upload." };
  }

  const uploadResponse = await fetch(prepared.uploadUrl, {
    method: "PUT",
    body: file,
    headers: prepared.uploadHeaders ?? { "Content-Type": file.type },
  });
  if (!uploadResponse.ok) {
    return { ok: false, message: "Upload thất bại." };
  }

  const dims = await readImageSize(file);
  const complete = new FormData();
  complete.set("objectKey", prepared.objectKey);
  complete.set("bucket", prepared.bucket ?? "public");
  complete.set("mimeType", file.type);
  complete.set("sizeBytes", String(file.size));
  complete.set("altText", altText);
  complete.set("context", input.context ?? "content:inline");
  if (dims) {
    complete.set("width", String(dims.width));
    complete.set("height", String(dims.height));
  }

  const result = await completeEditorMediaUploadAction(complete);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, publicId: result.publicId, url: result.url, altText };
}
