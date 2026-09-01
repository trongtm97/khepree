"use client";

import { Button } from "@khepree/ui";
import { useRef, useState } from "react";
import { uploadPublicContentImage } from "@/lib/media/upload-public-content-image";

type Props = {
  label: string;
  name: string;
  defaultPublicId?: string | null;
  productId: string;
  required?: boolean;
  multiple?: boolean;
  defaultGalleryIds?: string[];
};

export function ProductMediaField({
  label,
  name,
  defaultPublicId,
  productId,
  required,
  multiple,
  defaultGalleryIds = [],
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [publicId, setPublicId] = useState(defaultPublicId ?? "");
  const [gallery, setGallery] = useState<string[]>(defaultGalleryIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onPick(file: File) {
    setError(null);
    setPending(true);
    try {
      const result = await uploadPublicContentImage(file, {
        altText: label,
        context: `product:${productId}`,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (multiple) {
        setGallery((prev) => [...prev, result.publicId]);
      } else {
        setPublicId(result.publicId);
      }
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
            {pending ? "Đang tải…" : publicId || gallery.length ? "Thay ảnh" : "Tải lên"}
          </Button>
          {(publicId || gallery.length > 0) && !multiple ? (
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setPublicId("")}>
              Xóa
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onPick(file);
          e.target.value = "";
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!multiple ? (
        <>
          <input type="hidden" name={name} value={publicId} />
          {publicId ? (
            <p className="truncate text-xs text-khepree-slate/70">{publicId}</p>
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
          <ul className="space-y-1 text-xs text-khepree-slate/70">
            {gallery.map((id, index) => (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="truncate">{id}</span>
                <span className="flex gap-1">
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
