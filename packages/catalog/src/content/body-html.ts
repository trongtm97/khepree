import {
  expandProductBlocks,
  renderContentMarkdown,
  type ProductCtaBlock,
} from "./markdown";
import { sanitizeContentHtml, stripUnsafeMarkdownSource } from "./sanitize";

/** Promote markdown H1 to H2 — page title is the only H1. */
export function normalizeContentHeadings(source: string): string {
  return source.replace(/^#\s+(?!#)/gm, "## ");
}

export function isLikelyHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("<")) return true;
  return /<(h[2-4]|p|ul|ol|table|blockquote|img|figure|div|a|strong|em|u)\b/i.test(trimmed);
}

/** Load stored body (markdown or HTML) into the WYSIWYG surface. */
export function contentToEditorHtml(value: string, options?: { productBlocks?: Record<string, ProductCtaBlock> }): string {
  return renderContentBody(value, options);
}

/** Normalize editor HTML before persisting. */
export function serializeEditorHtml(html: string): string {
  return sanitizeContentHtml(html.replace(/<!--[\s\S]*?-->/g, ""));
}

export function renderContentBody(
  body: string,
  options?: { productBlocks?: Record<string, ProductCtaBlock> },
): string {
  if (isLikelyHtmlContent(body)) {
    let source = stripUnsafeMarkdownSource(body);
    source = expandProductBlocks(source, (slug) => options?.productBlocks?.[slug] ?? null);
    return sanitizeContentHtml(source);
  }
  return renderContentMarkdown(normalizeContentHeadings(body), options);
}
