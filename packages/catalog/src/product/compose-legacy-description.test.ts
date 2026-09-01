import { describe, expect, it } from "vitest";
import {
  composeMarketingToMarkdown,
  migrateLegacyDescriptionCopy,
  resolvePublicFullDescription,
} from "./compose-legacy-description";

describe("compose-legacy-description", () => {
  const marketing = {
    solutions: [{ problem: "Slow workflow", helps: "Automates steps", result: "Ship faster" }],
    highlights: [{ title: "AI assist", description: "Context-aware suggestions" }],
    faq: [{ question: "Free trial?", answer: "Yes, 24 hours" }],
  };

  it("composes marketing blocks to markdown", () => {
    const md = composeMarketingToMarkdown(marketing);
    expect(md).toContain("## Giới thiệu");
    expect(md).toContain("Slow workflow");
    expect(md).toContain("## Tính năng nổi bật");
    expect(md).toContain("## Câu hỏi thường gặp");
  });

  it("prefers merged description over legacy marketing", () => {
    const resolved = resolvePublicFullDescription({
      description: "Primary copy",
      content: "More copy",
      marketing,
    });
    expect(resolved).toBe("Primary copy\n\nMore copy");
  });

  it("falls back to marketing when description empty", () => {
    const resolved = resolvePublicFullDescription({
      description: null,
      content: null,
      marketing,
    });
    expect(resolved).toContain("Slow workflow");
  });

  it("migrates idempotently", () => {
    const first = migrateLegacyDescriptionCopy({ description: null, content: null, marketing });
    expect(first.migrated).toBe(true);
    expect(first.description).toContain("Slow workflow");

    const second = migrateLegacyDescriptionCopy({
      description: first.description,
      content: null,
      marketing,
    });
    expect(second.migrated).toBe(false);
    expect(second.description).toBe(first.description);
  });
});
