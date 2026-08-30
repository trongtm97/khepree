"use client";

import { Alert, Button, Input, Select } from "@khepree/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  completeMediaLibraryUploadAction,
  prepareMediaLibraryUploadAction,
} from "@/app/(admin)/media/media-actions";

async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
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

export function MediaUploadPanel() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Chọn tệp");
      setPending(false);
      return;
    }

    try {
      const visibility = (form.elements.namedItem("visibility") as HTMLSelectElement).value as
        | "public"
        | "private";
      const prep = new FormData();
      prep.set("mimeType", file.type || "application/octet-stream");
      prep.set("sizeBytes", String(file.size));
      prep.set("visibility", visibility);
      prep.set("namespace", visibility === "public" ? "media" : "uploads");
      prep.set("pathPrefix", visibility === "public" ? "media" : "");
      prep.set("context", (form.elements.namedItem("context") as HTMLInputElement | null)?.value ?? "");

      const prepared = await prepareMediaLibraryUploadAction({}, prep);
      if (prepared.error || !prepared.uploadUrl || !prepared.objectKey) {
        setError(prepared.error ?? "Không thể chuẩn bị upload");
        return;
      }

      const uploadResponse = await fetch(prepared.uploadUrl, {
        method: "PUT",
        body: file,
        headers: prepared.uploadHeaders ?? {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!uploadResponse.ok) {
        setError("Upload thất bại");
        return;
      }

      const dims = await readImageSize(file);
      const complete = new FormData();
      complete.set("objectKey", prepared.objectKey);
      complete.set("bucket", prepared.bucket ?? visibility);
      complete.set("mimeType", file.type || "application/octet-stream");
      complete.set("sizeBytes", String(file.size));
      complete.set("altText", (form.elements.namedItem("altText") as HTMLInputElement | null)?.value ?? "");
      complete.set("context", (form.elements.namedItem("context") as HTMLInputElement | null)?.value ?? "");
      if (dims) {
        complete.set("width", String(dims.width));
        complete.set("height", String(dims.height));
      }

      const result = await completeMediaLibraryUploadAction({}, complete);
      if (result.error) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded border border-khepree-mist p-4">
      <p className="text-sm font-medium">Tải lên media</p>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Select
        name="visibility"
        label="Hiển thị"
        defaultValue="public"
        options={[
          { value: "public", label: "Public (ảnh marketing)" },
          { value: "private", label: "Private" },
        ]}
      />
      <Input name="context" label="Ngữ cảnh (tùy chọn)" placeholder="product:… hoặc content:…" />
      <Input name="altText" label="Alt text (bắt buộc cho ảnh public)" />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Tệp</span>
        <input type="file" name="file" required className="block w-full text-sm" accept="image/*,.pdf,.svg" />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang tải…" : "Tải lên"}
      </Button>
    </form>
  );
}
