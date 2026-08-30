import { describe, expect, it } from "vitest";
import {
  canPublishLegalPage,
  getLegalPageMeta,
  publishedLegalPaths,
  type LegalPageMeta,
} from "./legal-pages";

describe("legal-pages", () => {
  it("publishes registry entries with required metadata", () => {
    for (const id of ["privacy", "terms", "refund", "eula", "cookies"] as const) {
      expect(canPublishLegalPage(getLegalPageMeta(id))).toBe(true);
    }
    expect(publishedLegalPaths()).toContain("/cookies");
  });

  it("blocks publish when version or effective date is missing", () => {
    const base = getLegalPageMeta("privacy");
    expect(canPublishLegalPage({ ...base, version: "" })).toBe(false);
    expect(canPublishLegalPage({ ...base, effectiveDate: "" })).toBe(false);
    expect(canPublishLegalPage({ ...base, status: "draft" })).toBe(false);
  });

  it("keeps legal review marker internal", () => {
    const meta: LegalPageMeta = getLegalPageMeta("terms");
    expect(meta.legalReviewRequired).toBe(true);
  });
});
