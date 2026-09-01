"use client";

import { productImageSpec, type ProductImageSlot } from "@khepree/catalog/product/image-specs";
import { Button, Input, Modal } from "@khepree/ui";
import { useEffect, useState } from "react";
import {
  listEditorMediaImagesAction,
  type EditorMediaImage,
} from "@/app/(admin)/content/content-media-actions";
import { uploadProductImage } from "@/lib/media/upload-product-image";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  imageSlot: ProductImageSlot;
  altText: string;
  onPick: (publicId: string, previewUrl: string) => void;
};

export function ProductMediaPickerDialog({
  open,
  onClose,
  productId,
  imageSlot,
  altText,
  onPick,
}: Props) {
  const spec = productImageSpec(imageSlot);
  const [library, setLibrary] = useState<EditorMediaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState(altText);

  useEffect(() => {
    if (!open) return;
    setUploadAlt(altText);
    setError(null);
    setLoading(true);
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
  }, [open, altText]);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadProductImage(file, {
      slot: imageSlot,
      productId,
      altText: uploadAlt.trim() || altText,
    });
    setUploading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onPick(result.publicId, result.url);
    onClose();
  }

  function pickFromLibrary(image: EditorMediaImage) {
    onPick(image.publicId, image.url);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chọn ảnh — ${spec.labelVi}`}
      className="max-w-2xl"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <p className="mb-3 text-xs text-khepree-slate/70">{spec.hintVi}</p>

      <div className="space-y-3 border-b border-khepree-mist pb-4">
        <Input
          label="Alt text (khi tải mới)"
          value={uploadAlt}
          onChange={(e) => setUploadAlt(e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-khepree-slate">Tải ảnh mới</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm"
            disabled={uploading}
            onChange={(event) => void onUpload(event.target.files?.[0])}
            type="file"
          />
        </label>
        {uploading ? <p className="text-xs text-khepree-slate/70">Đang crop và tải lên…</p> : null}
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-khepree-slate/70">Thư viện ảnh</p>
        {loading ? <p className="text-xs text-khepree-slate/60">Đang tải…</p> : null}
        {!loading && library.length === 0 ? (
          <p className="text-xs text-khepree-slate/60">Chưa có ảnh — tải mới ở trên.</p>
        ) : (
          <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {library.map((image) => (
              <button
                className="overflow-hidden rounded border border-khepree-mist text-left hover:border-khepree-teal"
                key={image.publicId}
                onClick={() => pickFromLibrary(image)}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin media picker */}
                <img
                  alt={image.altText || image.publicId}
                  className="h-20 w-full object-cover"
                  src={image.url}
                />
                <span className="block truncate px-1 py-0.5 text-[10px] text-khepree-slate/70">
                  {image.publicId}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
