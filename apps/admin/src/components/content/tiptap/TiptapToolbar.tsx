"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@khepree/ui";

type Props = {
  disabled?: boolean;
  editor: Editor | null;
  onLinkClick?: () => void;
  onTableClick?: () => void;
  onProductClick?: () => void;
  onImageClick?: () => void;
  imageLoading?: boolean;
};

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      aria-label={title}
      aria-pressed={active}
      className={active ? "border-khepree-teal bg-khepree-teal/10" : undefined}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={title}
      type="button"
      variant="secondary"
    >
      {children}
    </Button>
  );
}

export function TiptapToolbar({ disabled, editor, onLinkClick, onTableClick, onProductClick, onImageClick, imageLoading }: Props) {
  if (!editor) return null;

  const run = (fn: () => void) => () => fn();

  return (
    <div className="flex flex-wrap gap-1" onMouseDown={(event) => event.preventDefault()}>
      <ToolbarButton disabled={disabled || !editor.can().undo()} onClick={run(() => editor.chain().focus().undo().run())} title="Hoàn tác">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={disabled || !editor.can().redo()} onClick={run(() => editor.chain().focus().redo().run())} title="Làm lại">
        Redo
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} title="H2">
        H2
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} disabled={disabled} onClick={run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())} title="H3">
        H3
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 4 })} disabled={disabled} onClick={run(() => editor.chain().focus().toggleHeading({ level: 4 }).run())} title="H4">
        H4
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("bold")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleBold().run())} title="In đậm">
        B
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleItalic().run())} title="In nghiêng">
        I
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleUnderline().run())} title="Gạch chân">
        U
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("bulletList")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleBulletList().run())} title="Danh sách">
        UL
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleOrderedList().run())} title="Danh sách số">
        OL
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleBlockquote().run())} title="Trích dẫn">
        Quote
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("codeBlock")} disabled={disabled} onClick={run(() => editor.chain().focus().toggleCodeBlock().run())} title="Khối mã">
        Code
      </ToolbarButton>
      <ToolbarButton disabled={disabled} onClick={run(() => editor.chain().focus().setHorizontalRule().run())} title="Đường ngăn">
        HR
      </ToolbarButton>
      {onLinkClick ? (
        <ToolbarButton active={editor.isActive("link")} disabled={disabled} onClick={onLinkClick} title="Link">
          Link
        </ToolbarButton>
      ) : null}
      {onImageClick ? (
        <ToolbarButton disabled={disabled || imageLoading} onClick={onImageClick} title="Chèn ảnh">
          Img
        </ToolbarButton>
      ) : null}
      {onTableClick ? (
        <ToolbarButton disabled={disabled} onClick={onTableClick} title="Bảng">
          Table
        </ToolbarButton>
      ) : null}
      {onProductClick ? (
        <ToolbarButton disabled={disabled} onClick={onProductClick} title="Khối sản phẩm">
          Product
        </ToolbarButton>
      ) : null}
      <ToolbarButton disabled={disabled} onClick={run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())} title="Xóa định dạng">
        Clear
      </ToolbarButton>
    </div>
  );
}
