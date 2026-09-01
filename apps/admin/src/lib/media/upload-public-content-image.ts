"use client";

import { completeEditorMediaUploadAction } from "@/app/(admin)/content/content-media-actions";
import { uploadViaPresignedPublic } from "@/lib/media/presigned-public-upload";

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

  const dims = await readImageSize(file);
  const context = input.context ?? "content:inline";

  const result = await uploadViaPresignedPublic({
    file,
    mimeType: file.type,
    sizeBytes: file.size,
    altText,
    context,
    width: dims?.width,
    height: dims?.height,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, publicId: result.publicId, url: result.url, altText };
}
