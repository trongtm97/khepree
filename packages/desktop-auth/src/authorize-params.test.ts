import { describe, expect, it } from "vitest";
import {
  buildDesktopAuthorizePath,
  buildDesktopCallbackUrl,
  parseDesktopAuthorizeSearchParams,
} from "./authorize-params";

describe("desktop authorize params", () => {
  it("round-trips authorize query params", () => {
    const params = {
      clientId: "dev-desktop-sample",
      redirectUri: "khepree-dev://auth/callback",
      codeChallenge: "abc123",
      codeChallengeMethod: "S256",
      state: "state-token",
    };
    const parsed = parseDesktopAuthorizeSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod,
      state: params.state,
    });
    expect(parsed).toEqual(params);
    expect(buildDesktopAuthorizePath(params)).toContain("client_id=dev-desktop-sample");
  });

  it("builds callback URLs without leaking secrets", () => {
    const url = buildDesktopCallbackUrl("khepree-dev://auth/callback", {
      code: "one-time-code",
      state: "state-token",
    });
    expect(url).toBe("khepree-dev://auth/callback?code=one-time-code&state=state-token");
    expect(url).not.toContain("password");
  });
});
