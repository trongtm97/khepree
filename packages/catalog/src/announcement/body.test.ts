import { describe, expect, it } from "vitest";
import { renderAnnouncementBodyHtml, sanitizeAnnouncementBody } from "./body";

describe("sanitizeAnnouncementBody", () => {
  it("strips script tags and raw HTML", () => {
    expect(sanitizeAnnouncementBody("Hello **world**")).toBe("Hello **world**");
    expect(sanitizeAnnouncementBody('<script>alert("x")</script>Safe')).toBe("Safe");
    expect(sanitizeAnnouncementBody("<img onerror=alert(1) src=x />")).toBeNull();
  });
});

describe("renderAnnouncementBodyHtml", () => {
  it("does not render executable script from markdown body", () => {
    const html = renderAnnouncementBodyHtml('<script>alert("x")</script>**Hi**');
    expect(html).not.toContain("<script");
    expect(html).toContain("<strong>Hi</strong>");
  });
});
