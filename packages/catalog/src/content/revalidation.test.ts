import { describe, expect, it } from "vitest";
import { buildContentRevalidationPlan, contentRevalidationTags } from "./revalidation";

describe("content revalidation", () => {
  it("builds cache tags for published content", () => {
    const tags = contentRevalidationTags({
      slug: "hello-world",
      contentType: "article",
      locale: "en",
    });
    expect(tags).toContain("content:article:en:hello-world");
    expect(tags).toContain("content-locale:en");
  });

  it("includes blog paths for articles", () => {
    const plan = buildContentRevalidationPlan({
      slug: "hello-world",
      contentType: "article",
      locale: "en",
    });
    expect(plan.paths).toContain("/en/blog/hello-world");
  });
});
