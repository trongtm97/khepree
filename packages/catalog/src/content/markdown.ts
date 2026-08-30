import { escapeHtml, sanitizeContentHtml, stripUnsafeMarkdownSource } from "./sanitize";

export interface ProductCtaBlock {
  slug: string;
  name: string;
  description: string;
  href: string;
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const safeHref = href.trim();
    if (!/^https?:\/\//i.test(safeHref) && !safeHref.startsWith("/") && !safeHref.startsWith("#")) {
      return escapeHtml(label);
    }
    const external = /^https?:\/\//i.test(safeHref);
    const rel = external ? ' rel="noopener noreferrer" target="_blank"' : "";
    return `<a href="${escapeHtml(safeHref)}"${rel}>${escapeHtml(label)}</a>`;
  });
  return out;
}

function productCtaHtml(block: ProductCtaBlock): string {
  return `<aside class="khepree-product-cta" data-product-slug="${escapeHtml(block.slug)}"><h3>${escapeHtml(block.name)}</h3><p>${escapeHtml(block.description)}</p><p><a href="${escapeHtml(block.href)}">${escapeHtml(block.name)}</a></p></aside>`;
}

export function expandProductBlocks(
  markdown: string,
  resolve?: (slug: string) => ProductCtaBlock | null | undefined,
): string {
  return markdown.replace(/^\[\[product:([a-z0-9-]+)\]\]\s*$/gim, (_line, slug: string) => {
    const block = resolve?.(slug.trim());
    if (!block) {
      return `<aside class="khepree-product-cta" data-product-slug="${escapeHtml(slug.trim())}"></aside>`;
    }
    return productCtaHtml(block);
  });
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("<aside") || trimmed.startsWith("<figure")) {
      html.push(trimmed);
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      html.push("<hr />");
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        codeLines.push(lines[i]!);
        i += 1;
      }
      i += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      html.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      html.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("> ")) {
        quoteLines.push(lines[i]!.trim().slice(2));
        i += 1;
      }
      html.push(`<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      html.push("<ul>");
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!.trim())) {
        html.push(`<li>${renderInline(lines[i]!.trim().replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      html.push("</ul>");
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      html.push("<ol>");
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!.trim())) {
        html.push(`<li>${renderInline(lines[i]!.trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      html.push("</ol>");
      continue;
    }

    if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(trimmed)) {
      const match = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
      if (match) {
        html.push(
          `<figure><img src="${escapeHtml(match[2]!)}" alt="${escapeHtml(match[1] ?? "")}" /><figcaption>${escapeHtml(match[1] ?? "")}</figcaption></figure>`,
        );
      }
      i += 1;
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^#{2,3}\s/.test(lines[i]!.trim()) &&
      !lines[i]!.trim().startsWith("<aside")
    ) {
      paragraphLines.push(lines[i]!.trim());
      i += 1;
    }
    html.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return html.join("\n");
}

export function renderContentMarkdown(
  markdown: string,
  options?: { productBlocks?: Record<string, ProductCtaBlock> },
): string {
  let source = stripUnsafeMarkdownSource(markdown);
  source = expandProductBlocks(source, (slug) => options?.productBlocks?.[slug] ?? null);
  const raw = renderMarkdownToHtml(source);
  return sanitizeContentHtml(raw);
}
