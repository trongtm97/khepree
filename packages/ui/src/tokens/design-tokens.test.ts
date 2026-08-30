import { describe, expect, it } from "vitest";
import { designTokens } from "./design-tokens";

describe("designTokens", () => {
  it("exposes Phase 17.1 semantic color tokens", () => {
    expect(designTokens.color.background).toBe("background");
    expect(designTokens.color.surface).toBe("surface");
    expect(designTokens.color.teal).toBe("teal");
    expect(designTokens.color.solarAccent).toBe("solar-accent");
  });
});
