import { describe, expect, it } from "vitest";
import { renderContentMarkdown } from "./markdown";
import { sanitizeContentHtml, stripUnsafeMarkdownSource } from "./sanitize";
import { createContentPreviewToken, verifyContentPreviewToken } from "./preview-token";
import { suggestContentSlug } from "./slug";
import { nextContentVersionNumber } from "./service";

describe("renderContentMarkdown", () => {
  it("renders h2 headings", () => {
    expect(renderContentMarkdown("## Tiêu đề")).toContain("<h2>Tiêu đề</h2>");
  });

  it("renders unordered lists", () => {
    const html = renderContentMarkdown("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
  });

  it("renders ordered lists", () => {
    const html = renderContentMarkdown("1. first\n2. second");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
  });

  it("renders links", () => {
    const html = renderContentMarkdown("[Khepree](/vi/products)");
    expect(html).toContain('<a href="/vi/products">Khepree</a>');
  });

  it("applies nofollow to third-party markdown links", () => {
    const html = renderContentMarkdown("[Facebook](https://www.facebook.com/KhepreeLabs)");
    expect(html).toContain('rel="nofollow noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("does not nofollow first-party absolute links", () => {
    const html = renderContentMarkdown("[Account](https://account.khepree.com)");
    expect(html).not.toContain("nofollow");
  });

  it("resolves product CTA blocks", () => {
    const html = renderContentMarkdown("[[product:translate]]\n", {
      productBlocks: {
        translate: {
          slug: "translate",
          name: "Khepree Translate",
          description: "Dịch AI",
          href: "/vi/products/translate",
        },
      },
    });
    expect(html).toContain("Khepree Translate");
    expect(html).toContain('/vi/products/translate');
    expect(html).toContain('data-product-slug="translate"');
  });

  it("escapes unsafe html in paragraph text", () => {
    const html = renderContentMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script");
  });

  it("renders tables in the supported subset", () => {
    const html = renderContentMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("drops javascript urls in links and images", () => {
    const html = renderContentMarkdown("[x](javascript:alert(1))\n\n![x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("drops malformed and protocol-relative links", () => {
    expect(renderContentMarkdown("[x](//evil.example)")).not.toContain("href=\"//");
    expect(renderContentMarkdown("[x](data:text/html,hi)")).not.toContain("data:");
  });
});

describe("sanitizeContentHtml", () => {
  it("strips script tags", () => {
    expect(sanitizeContentHtml('<p>ok</p><script>alert(1)</script>')).not.toContain("script");
  });

  it("strips inline event handlers", () => {
    expect(sanitizeContentHtml('<a href="/x" onclick="alert(1)">x</a>')).not.toContain("onclick");
  });

  it("rejects javascript and data image sources", () => {
    expect(sanitizeContentHtml('<img src="javascript:alert(1)" alt="x" />')).not.toContain("javascript:");
    expect(sanitizeContentHtml('<img src="data:text/html,hi" alt="x" />')).not.toContain("src=");
  });
});

describe("stripUnsafeMarkdownSource", () => {
  it("removes script blocks from markdown source", () => {
    expect(stripUnsafeMarkdownSource("hello<script>x</script>")).not.toContain("script");
  });
});

describe("content preview token", () => {
  it("round-trips", () => {
    const now = 1_700_000_000_000;
    const token = createContentPreviewToken({
      versionId: "ver-1",
      secret: "test-secret-32-chars-minimum!!",
      now,
    });
    expect(
      verifyContentPreviewToken({
        versionId: "ver-1",
        token,
        secret: "test-secret-32-chars-minimum!!",
        now: now + 1000,
      }),
    ).toBe(true);
  });

  it("rejects tampered version id", () => {
    const now = 1_700_000_000_000;
    const token = createContentPreviewToken({
      versionId: "ver-1",
      secret: "test-secret-32-chars-minimum!!",
      now,
    });
    expect(
      verifyContentPreviewToken({
        versionId: "ver-2",
        token,
        secret: "test-secret-32-chars-minimum!!",
        now: now + 1000,
      }),
    ).toBe(false);
  });
});

describe("publish versioning helpers", () => {
  it("increments version number for forked drafts", () => {
    expect(nextContentVersionNumber(5)).toBe(6);
  });
});

describe("suggestContentSlug", () => {
  it("defaults VI-friendly slug", () => {
    expect(suggestContentSlug("Hướng dẫn Khepree")).toMatch(/huong-dan/);
  });
});
