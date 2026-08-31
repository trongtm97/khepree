import { describe, expect, it } from "vitest";
import { isAllowlistedCustomSchemeUri, pickDesktopAppReturnUri } from "./return-uri";

describe("desktop return URI", () => {
  it("accepts registered custom schemes only", () => {
    expect(isAllowlistedCustomSchemeUri("khepree-dev://auth/callback")).toBe(true);
    expect(isAllowlistedCustomSchemeUri("https://evil.example/callback")).toBe(false);
    expect(isAllowlistedCustomSchemeUri("http://127.0.0.1:0/auth/callback")).toBe(false);
  });

  it("picks the first custom-scheme entry from allowlist", () => {
    expect(
      pickDesktopAppReturnUri([
        "http://127.0.0.1:0/auth/callback",
        "khepree-dev://auth/callback",
        "khepree-dev://other",
      ]),
    ).toBe("khepree-dev://auth/callback");
  });
});
