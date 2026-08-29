/** CMS bodies are stored as markdown; render paragraphs without a markdown library. */
export function contentParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}
