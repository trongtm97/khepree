"use client";

import { productImageSpec, type ProductImageSlot } from "@khepree/catalog/product/image-specs";
import { Alert, Button } from "@khepree/ui";
import { useEffect, useState } from "react";
import { resolveMediaPublicUrlAction } from "@/app/(admin)/content/content-media-actions";
import { ProductMediaPickerDialog } from "@/components/product-studio/product-media-picker-dialog";

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSession, setPickerSession] = useState(0);
  const [publicId, setPublicId] = useState(defaultPublicId ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailedId, setPreviewFailedId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>(defaultGalleryIds);
  const [galleryUrls, setGalleryUrls] = useState<Record<string, string>>({});
  const [galleryPreviewFailed, setGalleryPreviewFailed] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    let cancelled = false;
    void resolveMediaPublicUrlAction(publicId).then((r) => {
      if (!cancelled) setPreviewUrl(r.url);
    });
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  const previewFailed = previewFailedId === publicId;

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

  function onPicked(id: string, url: string) {
    void resolveMediaPublicUrlAction(id).then((resolved) => {
      const displayUrl = resolved.url ?? url;
      if (multiple) {
        setGallery((prev) => [...prev, id]);
        setGalleryUrls((prev) => ({ ...prev, [id]: displayUrl }));
        setGalleryPreviewFailed((prev) => ({ ...prev, [id]: false }));
        setSuccess("Đã thêm ảnh gallery · Nhớ bấm Lưu nháp để gắn vào sản phẩm.");
      } else {
        setPublicId(id);
        setPreviewUrl(displayUrl);
        setPreviewFailedId(null);
        setSuccess("Đã chọn ảnh · Nhớ bấm Lưu nháp để gắn vào sản phẩm.");
      }
    });
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
            onClick={() => {
              setPickerSession((n) => n + 1);
              setPickerOpen(true);
            }}
          >
            {publicId || gallery.length ? "Chọn / thay ảnh" : "Chọn ảnh"}
          </Button>
          {(publicId || gallery.length > 0) && !multiple ? (
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                setPublicId("");
                setPreviewUrl(null);
                setPreviewFailedId(null);
                setSuccess(null);
              }}
            >
              Xóa
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mb-3 text-xs text-khepree-slate/70">{spec.hintVi}</p>

      <div
        className={`mb-3 overflow-hidden rounded-md border border-dashed border-khepree-mist bg-khepree-cloud/30 ${aspectPreviewClass(imageSlot)} max-h-56 w-full`}
        title={`Khung hiển thị ${spec.aspectLabel}`}
      >
        {publicId && previewUrl && !multiple && !previewFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin product media preview
          <img
            alt=""
            className="h-full w-full object-cover object-center"
            src={previewUrl}
            onError={() => setPreviewFailedId(publicId)}
          />
        ) : previewFailed && publicId ? (
          <div className="flex h-full min-h-[5rem] items-center justify-center px-3 text-center text-[10px] text-khepree-slate/60">
            Ảnh đã lưu ({publicId}) — preview tạm không load
          </div>
        ) : (
          <div className="flex h-full min-h-[5rem] items-center justify-center text-[10px] text-khepree-slate/50">
            Khung {spec.aspectLabel}
          </div>
        )}
      </div>

      <ProductMediaPickerDialog
        key={pickerSession}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        productId={productId}
        imageSlot={imageSlot}
        altText={label}
        onPick={onPicked}
      />

      {success ? (
        <Alert variant="success" className="mb-2 text-xs">
          {success}
        </Alert>
      ) : null}

      {!multiple ? (
        <>
          <input type="hidden" name={name} value={publicId} />
          {publicId ? (
            <p className="truncate text-xs text-khepree-slate/70">
              {publicId} · {spec.width}×{spec.height} WebP
            </p>
          ) : (
            <p className="text-xs text-khepree-slate/50">
              {required ? "Bắt buộc — chọn từ thư viện hoặc tải mới" : "Chưa có ảnh"}
            </p>
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
                {galleryUrls[id] && !galleryPreviewFailed[id] ? (
                  <div
                    className={`h-12 w-20 shrink-0 overflow-hidden rounded border border-khepree-mist ${aspectPreviewClass(imageSlot)}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin gallery thumb */}
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={galleryUrls[id]}
                      onError={() =>
                        setGalleryPreviewFailed((prev) => ({ ...prev, [id]: true }))
                      }
                    />
                  </div>
                ) : galleryPreviewFailed[id] ? (
                  <span className="shrink-0 text-[10px] text-khepree-slate/50">Đã lưu</span>
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
          {gallery.length === 0 ? (
            <p className="text-xs text-khepree-slate/50">Chưa có ảnh gallery</p>
          ) : null}
        </>
      )}
    </div>
  );
}
