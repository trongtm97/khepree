import { renderContentMarkdown, type ProductCtaBlock } from "@khepree/catalog";

/** @deprecated Use renderContentBodyHtml — kept for tests referencing paragraph split removal. */
export function contentParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function renderContentBodyHtml(
  body: string,
  options?: { productBlocks?: Record<string, ProductCtaBlock> },
): string {
  return renderContentMarkdown(body, options);
}
