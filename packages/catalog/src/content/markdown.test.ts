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
});

describe("sanitizeContentHtml", () => {
  it("strips script tags", () => {
    expect(sanitizeContentHtml('<p>ok</p><script>alert(1)</script>')).not.toContain("script");
  });

  it("strips inline event handlers", () => {
    expect(sanitizeContentHtml('<a href="/x" onclick="alert(1)">x</a>')).not.toContain("onclick");
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
