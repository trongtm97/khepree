import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import type { Extensions } from "@tiptap/react";

export function createTiptapExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      horizontalRule: false,
      link: false,
      underline: false,
    }),
    Underline,
    HorizontalRule,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        class: "text-khepree-teal underline",
        rel: "noopener noreferrer",
      },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({
      placeholder: placeholder ?? "Viết nội dung…",
      emptyEditorClass: "is-editor-empty",
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({
      HTMLAttributes: { class: "my-3 max-w-full rounded-lg" },
    }),
  ];
}
