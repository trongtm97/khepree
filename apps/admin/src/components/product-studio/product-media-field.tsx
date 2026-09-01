"use client";

import {
  productImageCropNoticeVi,
  productImageNeedsCropNotice,
  productImageSpec,
  type ProductImageSlot,
} from "@khepree/catalog";
import { Alert, Button } from "@khepree/ui";
import { useEffect, useRef, useState } from "react";
import { resolveMediaPublicUrlAction } from "@/app/(admin)/content/content-media-actions";
import { uploadProductImageAction } from "@/app/(admin)/products/product-media-actions";

type Props = {
  label: string;
  name: string;
  imageSlot: ProductImageSlot;
  defaultPublicId?: string | null;
  productId: string;
  required?: boolean;
  multiple?: boolean;
  defaultGalleryIds?: string[];
};

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

function aspectPreviewClass(slot: ProductImageSlot): string {
  switch (slot) {
    case "icon":
      return "aspect-square";
    case "cover":
      return "aspect-video";
    case "gallery":
      return "aspect-video";
  }
}

export function ProductMediaField({
  label,
  name,
  imageSlot,
  defaultPublicId,
  productId,
  required,
  multiple,
  defaultGalleryIds = [],
}: Props) {
  const spec = productImageSpec(imageSlot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [publicId, setPublicId] = useState(defaultPublicId ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>(defaultGalleryIds);
  const [galleryUrls, setGalleryUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!publicId) {
      setPreviewUrl(null);
      return;
    }
    void resolveMediaPublicUrlAction(publicId).then((r) => setPreviewUrl(r.url));
  }, [publicId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries: Record<string, string> = {};
      for (const id of gallery) {
        const r = await resolveMediaPublicUrlAction(id);
        if (r.url) entries[id] = r.url;
      }
      if (!cancelled) setGalleryUrls(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [gallery]);

  async function onPick(file: File) {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const dims = await readImageSize(file);
      if (dims && productImageNeedsCropNotice(imageSlot, dims.width, dims.height)) {
        setNotice(productImageCropNoticeVi(imageSlot, dims.width, dims.height));
      }

      const form = new FormData();
      form.set("slot", imageSlot);
      form.set("productId", productId);
      form.set("file", file);
      form.set("altText", label);

      const result = await uploadProductImageAction(form);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (multiple) {
        setGallery((prev) => [...prev, result.publicId]);
        setGalleryUrls((prev) => ({ ...prev, [result.publicId]: result.url }));
      } else {
        setPublicId(result.publicId);
        setPreviewUrl(result.url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-khepree-mist bg-khepree-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Đang xử lý…" : publicId || gallery.length ? "Thay ảnh" : "Tải lên"}
          </Button>
          {(publicId || gallery.length > 0) && !multiple ? (
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setPublicId("")}>
              Xóa
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mb-3 text-xs text-khepree-slate/70">{spec.hintVi}</p>

      <div
        className={`mb-3 overflow-hidden rounded-md border border-dashed border-khepree-mist bg-khepree-cloud/30 ${aspectPreviewClass(imageSlot)} max-h-40 w-full max-w-xs`}
        title={`Khung hiển thị ${spec.aspectLabel}`}
      >
        {previewUrl && !multiple ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin product media preview
          <img alt="" className="h-full w-full object-cover object-center" src={previewUrl} />
        ) : (
          <div className="flex h-full min-h-[4rem] items-center justify-center text-[10px] text-khepree-slate/50">
            Khung {spec.aspectLabel}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onPick(file);
          e.target.value = "";
        }}
      />

      {notice ? (
        <Alert variant="info" className="mb-2 text-xs">
          {notice}
        </Alert>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {!multiple ? (
        <>
          <input type="hidden" name={name} value={publicId} />
          {publicId ? (
            <p className="truncate text-xs text-khepree-slate/70">
              {publicId} · {spec.width}×{spec.height} WebP
            </p>
          ) : (
            <p className="text-xs text-khepree-slate/50">Chưa có ảnh</p>
          )}
        </>
      ) : (
        <>
          {gallery.map((id, index) => (
            <input key={id} type="hidden" name={`${name}_${index}`} value={id} />
          ))}
          <input type="hidden" name={`${name}_count`} value={String(gallery.length)} />
          <ul className="space-y-2 text-xs text-khepree-slate/70">
            {gallery.map((id, index) => (
              <li key={id} className="flex items-center gap-2">
                {galleryUrls[id] ? (
                  <div className={`h-10 w-16 shrink-0 overflow-hidden rounded border border-khepree-mist ${aspectPreviewClass(imageSlot)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin gallery thumb */}
                    <img alt="" className="h-full w-full object-cover" src={galleryUrls[id]} />
                  </div>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{id}</span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="underline"
                    disabled={index === 0}
                    onClick={() =>
                      setGallery((prev) => {
                        if (index === 0) return prev;
                        const next = [...prev];
                        const a = next[index - 1]!;
                        const b = next[index]!;
                        next[index - 1] = b;
                        next[index] = a;
                        return next;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="underline"
                    disabled={index === gallery.length - 1}
                    onClick={() =>
                      setGallery((prev) => {
                        if (index >= prev.length - 1) return prev;
                        const next = [...prev];
                        const a = next[index]!;
                        const b = next[index + 1]!;
                        next[index] = b;
                        next[index + 1] = a;
                        return next;
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-red-600 underline"
                    onClick={() => setGallery((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Xóa
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {gallery.length === 0 ? <p className="text-xs text-khepree-slate/50">Chưa có ảnh gallery</p> : null}
        </>
      )}
    </div>
  );
}
