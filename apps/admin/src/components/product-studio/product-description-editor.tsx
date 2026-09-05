"use client";

import { productDescriptionTemplate } from "@khepree/catalog/product/studio-field-policy";
import { Button } from "@khepree/ui";
import { useState } from "react";
import { ContentTiptapEditor } from "@/components/content/content-tiptap-editor";

type Props = {
  name: string;
  defaultValue?: string;
  locale: "vi" | "en";
  onValueChange?: (value: string) => void;
};

/** Parent must remount with key={locale} so defaultValue initializes per locale. */
export function ProductDescriptionEditor({ name, defaultValue = "", locale, onValueChange }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [editorKey, setEditorKey] = useState(0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-khepree-slate">Mô tả đầy đủ</p>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => {
            const template = productDescriptionTemplate(locale);
            setValue(template);
            onValueChange?.(template);
            setEditorKey((k) => k + 1);
          }}
        >
          Chèn mẫu
        </Button>
      </div>
      <ContentTiptapEditor
        key={`${locale}-${editorKey}`}
        name={name}
        defaultValue={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
        placeholder={locale === "vi" ? "Giới thiệu, tính năng, FAQ…" : "Introduction, features, FAQ…"}
        size="large"
      />
      <p className="text-xs text-khepree-slate/60">
        Dùng một trường duy nhất — không tách marketing/FAQ riêng.
      </p>
    </div>
  );
}
