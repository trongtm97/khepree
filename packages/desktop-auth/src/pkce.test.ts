import { describe, expect, it } from "vitest";
import { createPkceChallenge, verifyPkceS256 } from "./pkce";

describe("desktop PKCE S256", () => {
  it("verifies a valid code verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = createPkceChallenge(verifier);
    expect(verifyPkceS256(verifier, challenge, "S256")).toBe(true);
  });

  it("rejects an invalid verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = createPkceChallenge(verifier);
    expect(verifyPkceS256("wrong-verifier", challenge, "S256")).toBe(false);
  });
});
