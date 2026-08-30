/** Escape HTML special characters in text nodes. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ALLOWED_TAGS = new Set([
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "pre",
  "code",
  "strong",
  "em",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "aside",
  "figure",
  "figcaption",
]);

const GLOBAL_ATTRS = new Set(["class", "data-product-slug"]);

function sanitizeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (trimmed.startsWith("#")) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return null;
}

function sanitizeSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/** Allowlist sanitizer — strips script/event handlers and unknown tags. */
export function sanitizeContentHtml(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, tagName: string, rawAttrs: string) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";

    if (match.startsWith("</")) return `</${tag}>`;

    const attrs: string[] = [];
    const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPattern.exec(rawAttrs)) !== null) {
      const name = attrMatch[1]!.toLowerCase();
      const value = attrMatch[2]!;
      if (name.startsWith("on")) continue;
      if (name === "href") {
        const safe = sanitizeHref(value);
        if (safe) {
          const external = /^https?:\/\//i.test(safe);
          attrs.push(`href="${escapeHtml(safe)}"`);
          if (external) attrs.push('rel="noopener noreferrer"');
          if (external) attrs.push('target="_blank"');
        }
        continue;
      }
      if (name === "src") {
        const safe = sanitizeSrc(value);
        if (safe) attrs.push(`src="${escapeHtml(safe)}"`);
        continue;
      }
      if (GLOBAL_ATTRS.has(name)) {
        attrs.push(`${name}="${escapeHtml(value)}"`);
      }
    }

    return attrs.length ? `<${tag} ${attrs.join(" ")}>` : `<${tag}>`;
  });
}

/** Strip raw script tags and inline HTML blocks from markdown source. */
export function stripUnsafeMarkdownSource(markdown: string): string {
  return markdown.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}
