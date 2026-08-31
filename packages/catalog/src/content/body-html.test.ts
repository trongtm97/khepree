import { describe, expect, it } from "vitest";
import {
  contentToEditorHtml,
  isLikelyHtmlContent,
  renderContentBody,
  serializeEditorHtml,
} from "./body-html";

describe("body-html", () => {
  it("detects HTML content", () => {
    expect(isLikelyHtmlContent("<p>Hello</p>")).toBe(true);
    expect(isLikelyHtmlContent("## Markdown")).toBe(false);
  });

  it("renders markdown bodies", () => {
    expect(renderContentBody("## Tiêu đề")).toContain("<h2>Tiêu đề</h2>");
  });

  it("sanitizes stored HTML bodies", () => {
    const html = "<p>Hello</p><script>alert(1)</script>";
    expect(renderContentBody(html)).toContain("<p>Hello</p>");
    expect(renderContentBody(html)).not.toContain("script");
  });

  it("round-trips editor HTML", () => {
    const raw = "<h2>Title</h2><p>Body <strong>bold</strong></p>";
    expect(contentToEditorHtml(raw)).toContain("<h2>Title</h2>");
    expect(serializeEditorHtml(raw)).toContain("<strong>bold</strong>");
  });
});
