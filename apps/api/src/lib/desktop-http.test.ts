import { describe, expect, it } from "vitest";
import { desktopAuthStatus, readDesktopExchangeBody } from "./desktop-http";

describe("desktop-http", () => {
  it("maps auth failures to 401", () => {
    expect(desktopAuthStatus("AUTH_CODE_INVALID")).toBe(401);
    expect(desktopAuthStatus("PKCE_INVALID")).toBe(401);
  });

  it("reads exchange body fields", () => {
    expect(
      readDesktopExchangeBody({
        clientId: "dev",
        code: "abc",
        redirectUri: "khepree-dev://auth/callback",
        codeVerifier: "verifier",
        devicePublicKey: "key",
        installationId: "install",
      }),
    ).toMatchObject({
      clientId: "dev",
      installationId: "install",
    });
  });
});
