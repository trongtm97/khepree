"use client";

import { completeEditorMediaUploadAction } from "@/app/(admin)/content/content-media-actions";
import { prepareMediaLibraryUploadAction } from "@/app/(admin)/media/media-actions";

export type PresignedPublicUploadResult =
  | { ok: true; publicId: string; url: string }
  | { ok: false; message: string; networkError?: boolean };

export function isPresignedNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error && /failed to fetch/i.test(error.message)) return true;
  return false;
}

export async function uploadViaPresignedPublic(input: {
  file: Blob;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  context: string;
  contentClass?: string;
  width?: number;
  height?: number;
}): Promise<PresignedPublicUploadResult> {
  const prep = new FormData();
  prep.set("mimeType", input.mimeType);
  prep.set("sizeBytes", String(input.sizeBytes));
  prep.set("visibility", "public");
  prep.set("namespace", "media");
  prep.set("pathPrefix", "media");
  prep.set("context", input.context);
  if (input.contentClass) prep.set("contentClass", input.contentClass);

  let prepared: Awaited<ReturnType<typeof prepareMediaLibraryUploadAction>>;
  try {
    prepared = await prepareMediaLibraryUploadAction({}, prep);
  } catch (error) {
    if (isPresignedNetworkError(error)) {
      return {
        ok: false,
        message: "Không chuẩn bị upload (mất kết nối admin).",
        networkError: true,
      };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không chuẩn bị upload.",
    };
  }

  if (prepared.error || !prepared.uploadUrl || !prepared.objectKey) {
    return {
      ok: false,
      message: prepared.error
        ? `Không chuẩn bị upload: ${prepared.error}`
        : "Không chuẩn bị upload.",
    };
  }

  try {
    const uploadResponse = await fetch(prepared.uploadUrl, {
      method: "PUT",
      body: input.file,
      headers: prepared.uploadHeaders ?? { "Content-Type": input.mimeType },
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text().catch(() => "");
      return {
        ok: false,
        message: detail
          ? `Upload S3 thất bại (kiểm tra CORS bucket): ${detail.slice(0, 200)}`
          : "Upload S3 thất bại (kiểm tra CORS bucket).",
      };
    }
  } catch (error) {
    if (isPresignedNetworkError(error)) {
      return {
        ok: false,
        message: "Upload S3 thất bại (CORS bucket hoặc mạng).",
        networkError: true,
      };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upload S3 thất bại.",
    };
  }

  const complete = new FormData();
  complete.set("objectKey", prepared.objectKey);
  complete.set("bucket", prepared.bucket ?? "public");
  complete.set("mimeType", input.mimeType);
  complete.set("sizeBytes", String(input.sizeBytes));
  complete.set("altText", input.altText);
  complete.set("context", input.context);
  if (input.width) complete.set("width", String(input.width));
  if (input.height) complete.set("height", String(input.height));

  try {
    const result = await completeEditorMediaUploadAction(complete);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return { ok: true, publicId: result.publicId, url: result.url };
  } catch (error) {
    if (isPresignedNetworkError(error)) {
      return {
        ok: false,
        message: "Không ghi metadata ảnh (mất kết nối admin).",
        networkError: true,
      };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không ghi metadata ảnh.",
    };
  }
}
