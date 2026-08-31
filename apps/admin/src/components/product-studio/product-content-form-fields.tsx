"use client";

import { ContentTiptapEditor } from "@/components/content/content-tiptap-editor";

type Props = {
  defaultDescription?: string;
  defaultContent?: string;
};

export function ProductContentFormFields({ defaultDescription = "", defaultContent = "" }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-sm font-medium text-khepree-slate">Mô tả dài</p>
        <ContentTiptapEditor
          name="description"
          defaultValue={defaultDescription}
          placeholder="Mô tả chi tiết sản phẩm…"
          size="large"
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-khepree-slate">Nội dung bổ sung</p>
        <ContentTiptapEditor
          name="content"
          defaultValue={defaultContent}
          placeholder="Nội dung mở rộng — hướng dẫn, chi tiết kỹ thuật…"
          size="large"
        />
      </div>
    </div>
  );
}
