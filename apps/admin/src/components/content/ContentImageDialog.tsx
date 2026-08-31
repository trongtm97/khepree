"use client";

import { Button, Input } from "@khepree/ui";
import { useEffect, useState } from "react";
import {
  listEditorMediaImagesAction,
  type EditorMediaImage,
} from "@/app/(admin)/content/content-media-actions";
import { uploadPublicContentImage } from "@/lib/media/upload-public-content-image";

export type PickedImage = { url: string; alt: string; publicId?: string };

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPick: (image: PickedImage) => void;
  pickPublicId?: boolean;
};

export function ContentImageDialog({
  open,
  title = "Chèn ảnh",
  onClose,
  onPick,
  pickPublicId = false,
}: Props) {
  const [library, setLibrary] = useState<EditorMediaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listEditorMediaImagesAction()
      .then((items) => {
        if (!cancelled) setLibrary(items);
      })
      .catch(() => {
        if (!cancelled) setError("Không tải được thư viện ảnh.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadPublicContentImage(file, {
      altText: altText.trim() || file.name.replace(/\.[^.]+$/, ""),
      context: "content:inline",
    });
    setUploading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (pickPublicId && result.publicId) {
      onPick({ url: result.url, alt: result.altText, publicId: result.publicId });
    } else {
      onPick({ url: result.url, alt: result.altText });
    }
    onClose();
  }

  function pickFromLibrary(image: EditorMediaImage) {
    if (pickPublicId) {
      onPick({ url: image.url, alt: image.altText, publicId: image.publicId });
    } else {
      onPick({ url: image.url, alt: image.altText });
    }
    onClose();
  }

  return (
    <div className="rounded-lg border border-khepree-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-khepree-slate">{title}</p>
        <button className="text-xs text-khepree-slate/70 hover:text-khepree-slate" onClick={onClose} type="button">
          Đóng
        </button>
      </div>

      <div className="space-y-3 border-b border-khepree-mist pb-4">
        <Input label="Alt text (bắt buộc khi tải mới)" value={altText} onChange={(e) => setAltText(e.target.value)} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-khepree-slate">Tải ảnh mới</span>
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block w-full text-sm"
            disabled={uploading}
            onChange={(event) => void onUpload(event.target.files?.[0])}
            type="file"
          />
        </label>
        {uploading ? <p className="text-xs text-khepree-slate/70">Đang tải…</p> : null}
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-khepree-slate/70">Thư viện gần đây</p>
        {loading ? <p className="text-xs text-khepree-slate/60">Đang tải…</p> : null}
        {!loading && library.length === 0 ? (
          <p className="text-xs text-khepree-slate/60">Chưa có ảnh public.</p>
        ) : (
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {library.map((image) => (
              <button
                className="overflow-hidden rounded border border-khepree-mist text-left hover:border-khepree-teal"
                key={image.publicId}
                onClick={() => pickFromLibrary(image)}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin media picker */}
                <img alt={image.altText || image.publicId} className="h-20 w-full object-cover" src={image.url} />
                <span className="block truncate px-1 py-0.5 text-[10px] text-khepree-slate/70">{image.publicId}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button onClick={onClose} type="button" variant="secondary">
          Hủy
        </Button>
      </div>
    </div>
  );
}
