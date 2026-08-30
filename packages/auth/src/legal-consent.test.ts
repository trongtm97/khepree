import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENT_VERSION } from "./legal-consent";

describe("legal consent", () => {
  it("uses a stable document version string", () => {
    expect(LEGAL_DOCUMENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
