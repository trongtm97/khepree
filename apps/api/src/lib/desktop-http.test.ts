import { describe, expect, it } from "vitest";
import { desktopAuthStatus, readDesktopCheckoutBody, readDesktopExchangeBody } from "./desktop-http";

describe("desktop-http", () => {
  it("maps auth failures to 401", () => {
    expect(desktopAuthStatus("AUTH_CODE_INVALID")).toBe(401);
    expect(desktopAuthStatus("PKCE_INVALID")).toBe(401);
    expect(desktopAuthStatus("SESSION_EXPIRED")).toBe(401);
  });

  it("maps entitlement failures to 403", () => {
    expect(desktopAuthStatus("ENTITLEMENT_MISSING")).toBe(403);
    expect(desktopAuthStatus("ENTITLEMENT_SUSPENDED")).toBe(403);
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

  it("reads checkout body fields", () => {
    expect(
      readDesktopCheckoutBody({
        clientId: "dev-client",
        planPublicId: "plan_pro",
        pricePublicId: "price_vnd",
        locale: "vi",
      }),
    ).toMatchObject({
      clientId: "dev-client",
      planPublicId: "plan_pro",
      pricePublicId: "price_vnd",
      locale: "vi",
    });
  });
});
