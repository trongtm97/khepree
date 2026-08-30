import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth layout responsive", () => {
  it("hides brand panel on mobile (single column)", () => {
    const source = readFileSync(join(process.cwd(), "src/components/auth-layout.tsx"), "utf8");
    expect(source).toContain("hidden min-h-dvh lg:block");
    expect(source).toContain("min-h-dvh");
    expect(source).toContain('context="auth"');
  });
});
