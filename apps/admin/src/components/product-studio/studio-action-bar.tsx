"use client";

import { publishProductAction } from "@/app/(admin)/products/studio-actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@khepree/ui";
import Link from "next/link";

type Props = {
  productId: string;
  previewUrl: string;
  formId: string;
};

export function StudioActionBar({ productId, previewUrl, formId }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-khepree-mist bg-khepree-white/95 px-4 py-3 backdrop-blur md:left-56">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
        <Link
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-khepree-mist px-4 text-sm hover:bg-khepree-mist/40"
        >
          Xem trước
        </Link>
        <Button type="submit" form={formId} variant="secondary">
          Lưu nháp
        </Button>
        <ActionForm action={publishProductAction} submitLabel="Xuất bản">
          <input type="hidden" name="productId" value={productId} />
        </ActionForm>
      </div>
    </div>
  );
}
