"use client";

import { Button, Textarea } from "@khepree/ui";
import { renderContentMarkdown } from "@khepree/catalog/markdown";
import { useMemo, useState } from "react";

const TOOLBAR: Array<{ label: string; insert: string }> = [
  { label: "H2", insert: "## " },
  { label: "H3", insert: "### " },
  { label: "B", insert: "**bold**" },
  { label: "I", insert: "*italic*" },
  { label: "Link", insert: "[text](https://)" },
  { label: "UL", insert: "- item\n" },
  { label: "OL", insert: "1. item\n" },
  { label: "Quote", insert: "> quote\n" },
  { label: "Code", insert: "```\ncode\n```\n" },
  { label: "HR", insert: "---\n" },
  { label: "Product", insert: "[[product:slug]]\n" },
];

export function ContentMarkdownEditor({
  name = "body",
  defaultValue = "",
}: {
  name?: string;
  defaultValue?: string;
}) {
  const [body, setBody] = useState(defaultValue);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const previewHtml = useMemo(() => renderContentMarkdown(body), [body]);

  function insertSnippet(snippet: string) {
    setBody((current) => (current ? `${current}\n${snippet}` : snippet));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TOOLBAR.map((item) => (
          <Button key={item.label} type="button" variant="secondary" onClick={() => insertSnippet(item.insert)}>
            {item.label}
          </Button>
        ))}
        <Button type="button" variant="secondary" onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>
          {mode === "edit" ? "Xem trước" : "Soạn thảo"}
        </Button>
      </div>
      {mode === "edit" ? (
        <Textarea name={name} label="Nội dung (Markdown)" value={body} onChange={(e) => setBody(e.target.value)} rows={18} />
      ) : (
        <div
          className="prose prose-sm max-w-none rounded border border-khepree-mist p-4"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}
