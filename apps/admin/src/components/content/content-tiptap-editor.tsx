"use client";

import { contentToEditorHtml, serializeEditorHtml } from "@khepree/catalog/content/body-html";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContentImageDialog } from "@/components/content/ContentImageDialog";
import { InsertTableDialog } from "@/components/content/tiptap/InsertTableDialog";
import { TiptapLinkDialog, type LinkDialogState } from "@/components/content/tiptap/TiptapLinkDialog";
import { TiptapToolbar } from "@/components/content/tiptap/TiptapToolbar";
import { createTiptapExtensions } from "@/lib/tiptap/create-extensions";

type EditorMode = "visual" | "html";

type EditorSize = "default" | "large";

type Props = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  size?: EditorSize;
};

const SURFACE_SIZE_CLASS: Record<EditorSize, string> = {
  default: "min-h-[480px] max-h-[75vh]",
  large: "min-h-[640px] max-h-[85vh]",
};

const defaultLinkDialog: LinkDialogState = {
  url: "https://",
  label: "Nhãn link",
  newTab: true,
  nofollow: false,
};

const surfaceBaseClass =
  "overflow-y-auto w-full rounded-lg border border-khepree-mist bg-white px-4 py-3 text-sm leading-7 text-khepree-slate outline-none focus-within:ring-2 focus-within:ring-khepree-teal/30 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:outline-none [&_a]:text-khepree-teal [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-khepree-mist [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-semibold [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-khepree-mist [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-khepree-mist [&_th]:bg-khepree-cloud/50 [&_th]:px-3 [&_th]:py-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg";

function buildLinkRel(input: LinkDialogState) {
  const parts: string[] = [];
  if (input.nofollow) parts.push("nofollow");
  if (input.newTab) parts.push("noopener", "noreferrer");
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function ContentTiptapEditor({
  name = "body",
  defaultValue = "",
  placeholder,
  onValueChange,
  size = "default",
}: Props) {
  const surfaceClass = `${SURFACE_SIZE_CLASS[size]} ${surfaceBaseClass}`;
  const htmlTextareaMinHeight = size === "large" ? "min-h-[640px]" : "min-h-[480px]";
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<EditorMode>("visual");
  const [htmlDraft, setHtmlDraft] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>(defaultLinkDialog);
  const lastEmittedRef = useRef(defaultValue);
  const isExternalUpdateRef = useRef(false);

  const emitFromHtml = useCallback(
    (html: string) => {
      const next = serializeEditorHtml(html);
      lastEmittedRef.current = next;
      setValue(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createTiptapExtensions(placeholder),
    content: contentToEditorHtml(defaultValue),
    onUpdate: ({ editor: ed }) => {
      if (isExternalUpdateRef.current || mode !== "visual") return;
      emitFromHtml(ed.getHTML());
    },
  });

  const syncEditorFromValue = useCallback(
    (source: string) => {
      if (!editor) return;
      isExternalUpdateRef.current = true;
      editor.commands.setContent(contentToEditorHtml(source), { emitUpdate: false });
      isExternalUpdateRef.current = false;
    },
    [editor],
  );

  useEffect(() => {
    if (!editor || mode !== "visual") return;
    if (value === lastEmittedRef.current) return;
    syncEditorFromValue(value);
    lastEmittedRef.current = value;
  }, [value, mode, editor, syncEditorFromValue]);

  function switchMode(nextMode: EditorMode) {
    if (nextMode === mode) return;
    if (mode === "visual" && editor) {
      emitFromHtml(editor.getHTML());
      if (nextMode === "html") {
        setHtmlDraft(contentToEditorHtml(lastEmittedRef.current));
      }
    } else if (nextMode === "visual") {
      const plain = serializeEditorHtml(htmlDraft);
      lastEmittedRef.current = plain;
      setValue(plain);
      onValueChange?.(plain);
      syncEditorFromValue(plain);
    }
    setMode(nextMode);
  }

  function openLinkDialog() {
    const selected = editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
    setLinkDialog({ ...defaultLinkDialog, label: selected?.trim() || defaultLinkDialog.label });
    setShowLinkDialog(true);
  }

  function confirmInsertLink() {
    if (!editor) return;
    const url = linkDialog.url.trim();
    if (!url) return;
    const rel = buildLinkRel(linkDialog);
    const target = linkDialog.newTab ? "_blank" : undefined;
    const { empty } = editor.state.selection;
    if (!empty) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url, target, rel }).run();
    } else {
      const label = linkDialog.label.trim() || url;
      editor.chain().focus().insertContent(`<a href="${url}"${target ? ` target="${target}"` : ""}${rel ? ` rel="${rel}"` : ""}>${label}</a>`).run();
    }
    emitFromHtml(editor.getHTML());
    setShowLinkDialog(false);
  }

  function insertProductBlock() {
    const slug = window.prompt("Slug sản phẩm (vd: translate):");
    if (!slug?.trim() || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent(`<aside class="khepree-product-cta" data-product-slug="${slug.trim()}"></aside><p></p>`)
      .run();
    emitFromHtml(editor.getHTML());
  }

  function insertImage(image: { url: string; alt: string }) {
    if (!editor) return;
    editor.chain().focus().setImage({ src: image.url, alt: image.alt }).run();
    emitFromHtml(editor.getHTML());
  }

  return (
    <div className="space-y-3">
      <input name={name} type="hidden" value={value} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-khepree-mist bg-khepree-cloud/40 p-0.5">
          <button
            className={`rounded-md px-3 py-1 text-xs font-medium ${mode === "visual" ? "bg-white text-khepree-slate shadow-sm" : "text-khepree-slate/70"}`}
            onClick={() => switchMode("visual")}
            type="button"
          >
            Trực quan
          </button>
          <button
            className={`rounded-md px-3 py-1 text-xs font-medium ${mode === "html" ? "bg-white text-khepree-slate shadow-sm" : "text-khepree-slate/70"}`}
            onClick={() => switchMode("html")}
            type="button"
          >
            HTML
          </button>
        </div>
        {mode === "visual" ? (
          <TiptapToolbar
            editor={editor}
            onImageClick={() => setShowImageDialog(true)}
            onLinkClick={openLinkDialog}
            onProductClick={insertProductBlock}
            onTableClick={() => setShowTableDialog(true)}
          />
        ) : null}
      </div>

      {showImageDialog ? (
        <ContentImageDialog
          onClose={() => setShowImageDialog(false)}
          onPick={insertImage}
          open={showImageDialog}
          title="Chèn ảnh vào bài viết"
        />
      ) : null}

      {showTableDialog ? (
        <InsertTableDialog
          onClose={() => setShowTableDialog(false)}
          onInsert={(rows, cols, headerRow) => {
            editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: headerRow }).run();
            if (editor) emitFromHtml(editor.getHTML());
          }}
          open={showTableDialog}
        />
      ) : null}

      {showLinkDialog ? (
        <TiptapLinkDialog
          linkDialog={linkDialog}
          onCancel={() => setShowLinkDialog(false)}
          onChange={setLinkDialog}
          onConfirm={confirmInsertLink}
        />
      ) : null}

      {mode === "visual" ? (
        <EditorContent
          className={`tiptap-surface ${surfaceClass} [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-khepree-slate/50 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]`}
          editor={editor}
        />
      ) : (
        <textarea
          className={`${htmlTextareaMinHeight} w-full resize-y rounded-lg border border-khepree-mist bg-white px-3 py-2 font-mono text-sm leading-7 text-khepree-slate outline-none focus:ring-2 focus:ring-khepree-teal/30`}
          onChange={(event) => {
            const html = event.target.value;
            setHtmlDraft(html);
            const next = serializeEditorHtml(html);
            lastEmittedRef.current = next;
            setValue(next);
            onValueChange?.(next);
          }}
          placeholder="Chèn hoặc chỉnh sửa mã HTML…"
          spellCheck={false}
          value={htmlDraft}
        />
      )}
    </div>
  );
}
