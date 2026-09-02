import { getOutboundLinkAttributes } from "@khepree/config";

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
  "h4",
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
  "u",
  "b",
  "i",
  "s",
  "mark",
  "sub",
  "sup",
  "span",
  "div",
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

const STYLE_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "p",
  "span",
  "mark",
  "li",
  "blockquote",
  "td",
  "th",
  "div",
  "a",
  "strong",
  "em",
  "u",
  "s",
  "sub",
  "sup",
  "code",
]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"]),
  img: new Set(["src", "alt", "title"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

const GLOBAL_ATTRS = new Set(["class", "data-product-slug"]);

const SAFE_COLOR = /^(#(?:[0-9a-f]{3,8})|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%]+\)|[a-z]+)$/i;

function sanitizeStyleAttribute(value: string): string {
  const safe: string[] = [];
  for (const declaration of value.split(";")) {
    const [rawProp, ...rest] = declaration.split(":");
    if (!rawProp || rest.length === 0) continue;
    const prop = rawProp.trim().toLowerCase();
    const propValue = rest.join(":").trim();
    if (!propValue || /url\(|expression|javascript:/i.test(propValue)) continue;
    if (prop === "color" || prop === "background-color") {
      if (SAFE_COLOR.test(propValue)) safe.push(`${prop}: ${propValue}`);
      continue;
    }
    if (prop === "text-align") {
      if (["left", "center", "right", "justify"].includes(propValue.toLowerCase())) {
        safe.push(`text-align: ${propValue.toLowerCase()}`);
      }
    }
  }
  return safe.join("; ");
}

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

    const allowed = TAG_ATTRS[tag];
    const attrs: string[] = [];
    const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPattern.exec(rawAttrs)) !== null) {
      const name = attrMatch[1]!.toLowerCase();
      const value = attrMatch[2]!;
      if (name.startsWith("on")) continue;
      if (name === "style" && STYLE_TAGS.has(tag)) {
        const safeStyle = sanitizeStyleAttribute(value);
        if (safeStyle) attrs.push(`style="${escapeHtml(safeStyle)}"`);
        continue;
      }
      if (name === "href") {
        const safe = sanitizeHref(value);
        if (safe) {
          attrs.push(`href="${escapeHtml(safe)}"`);
          const outbound = getOutboundLinkAttributes(safe);
          if (outbound.target) attrs.push(`target="${outbound.target}"`);
          if (outbound.rel) attrs.push(`rel="${escapeHtml(outbound.rel)}"`);
        }
        continue;
      }
      if (name === "src") {
        const safe = sanitizeSrc(value);
        if (safe) attrs.push(`src="${escapeHtml(safe)}"`);
        continue;
      }
      if (name === "rel") {
        attrs.push(`rel="${escapeHtml(value)}"`);
        continue;
      }
      if (name === "target" && value === "_blank") {
        attrs.push('target="_blank"');
        continue;
      }
      if (name === "alt" || name === "title") {
        attrs.push(`${name}="${escapeHtml(value)}"`);
        continue;
      }
      if ((name === "colspan" || name === "rowspan") && /^\d+$/.test(value)) {
        attrs.push(`${name}="${value}"`);
        continue;
      }
      if ((allowed && allowed.has(name)) || GLOBAL_ATTRS.has(name)) {
        attrs.push(`${name}="${escapeHtml(value)}"`);
      }
    }

    if (tag === "a" && !attrs.some((attr) => attr.startsWith("href="))) return "";
    if (tag === "img" && !attrs.some((attr) => attr.startsWith("src="))) return "";

    return attrs.length ? `<${tag} ${attrs.join(" ")}>` : `<${tag}>`;
  });
}

/** Strip raw script tags and inline HTML blocks from markdown source. */
export function stripUnsafeMarkdownSource(markdown: string): string {
  return markdown.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}
