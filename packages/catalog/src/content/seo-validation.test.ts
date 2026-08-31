import { describe, expect, it } from "vitest";
import { getContentSeoIssues, getContentSeoScore, countInternalLinks } from "./seo-validation";

describe("seo-validation", () => {
  it("flags missing SEO fields", () => {
    const issues = getContentSeoIssues({
      title: "Tiêu đề bài viết",
      excerpt: "",
      content: "<h2>Mục</h2><p>Text</p>",
      contentType: "article",
      coverMediaPublicId: "",
      seoTitle: "",
      seoDescription: "",
    });
    expect(issues).toContain("missing_excerpt");
    expect(issues).toContain("missing_seo_title");
  });

  it("flags H1 in content", () => {
    const issues = getContentSeoIssues({
      title: "Tiêu đề",
      excerpt: "Tóm tắt",
      content: "<h1>Bad</h1>",
      contentType: "article",
      coverMediaPublicId: "media-1",
      seoTitle: "SEO title đủ dài cho Google snippet test",
      seoDescription:
        "Meta description đủ dài để hiển thị trên Google với nội dung mô tả hấp dẫn và đầy đủ thông tin cho người đọc.",
    });
    expect(issues).toContain("content_has_h1");
  });

  it("counts internal links in HTML and markdown", () => {
    expect(countInternalLinks('<a href="/blog/foo">x</a> [y](/docs/bar)')).toBe(2);
  });

  it("scores good content higher than bad", () => {
    const good = getContentSeoScore({
      title: "Tiêu đề bài viết đủ dài cho SEO",
      excerpt: "Tóm tắt ngắn.",
      content: "<h2>Mục chính</h2><p>Nội dung.</p>",
      contentType: "article",
      coverMediaPublicId: "media-1",
      seoTitle: "SEO title đủ dài cho Google snippet test",
      seoDescription:
        "Meta description đủ dài để hiển thị trên Google với nội dung mô tả hấp dẫn và đầy đủ thông tin cho người đọc.",
    });
    const bad = getContentSeoScore({
      title: "",
      excerpt: "",
      content: "<h1>x</h1>",
      contentType: "article",
      coverMediaPublicId: "",
      seoTitle: "",
      seoDescription: "",
    });
    expect(good).toBeGreaterThan(bad);
  });
});
