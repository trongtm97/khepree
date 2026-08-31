export interface ContentHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Extract h2/h3 headings from markdown or HTML for TOC. */
export function extractContentHeadings(content: string): ContentHeading[] {
  if (/<h[23][\s>]/i.test(content)) {
    return extractHtmlHeadings(content);
  }
  return extractMarkdownHeadings(content);
}

function extractHtmlHeadings(html: string): ContentHeading[] {
  const headings: ContentHeading[] = [];
  const seen = new Map<string, number>();
  const pattern = /<h([23])[^>]*>([^<]+)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3;
    const text = match[2]!.trim();
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    if (count > 0) id = `${id}-${count + 1}`;
    seen.set(slugify(text), count + 1);
    headings.push({ id, text, level });
  }
  return headings;
}

/** @deprecated Use extractContentHeadings */
export function extractMarkdownHeadings(markdown: string): ContentHeading[] {
  const headings: ContentHeading[] = [];
  const seen = new Map<string, number>();

  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!match) continue;
    const level = match[1]!.length as 2 | 3;
    const text = match[2]!.trim();
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    if (count > 0) id = `${id}-${count + 1}`;
    seen.set(slugify(text), count + 1);
    headings.push({ id, text, level });
  }

  return headings;
}

/** Inject id attributes into rendered HTML h2/h3 for anchor links. */
export function injectHeadingIds(html: string, headings: ContentHeading[]): string {
  let index = 0;
  return html.replace(/<h([23])>([^<]+)<\/h\1>/g, (full, level, text) => {
    const heading = headings[index];
    index += 1;
    if (!heading) return full;
    return `<h${level} id="${heading.id}">${text}</h${level}>`;
  });
}
