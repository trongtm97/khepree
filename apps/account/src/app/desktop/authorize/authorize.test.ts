import { describe, expect, it } from "vitest";
import { buildDesktopAuthorizePath } from "@khepree/desktop-auth";
import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";

describe("desktop authorize redirect", () => {
  it("preserves desktop authorize path through safeAccountNextPath", () => {
    const next = buildDesktopAuthorizePath({
      clientId: "dev-desktop-sample",
      redirectUri: "khepree-dev://auth/callback",
      codeChallenge: "challenge",
      codeChallengeMethod: "S256",
      state: "state-token",
    });
    expect(safeAccountNextPath(next)).toBe(next);
  });
});
