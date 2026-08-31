import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const signInSocial = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { social: signInSocial } },
}));

describe("startGoogleOAuth", () => {
  beforeEach(() => {
    signInSocial.mockReset();
    vi.stubGlobal("window", { location: { href: "" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects manually when Better Auth returns url with redirect=false", async () => {
    signInSocial.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth", redirect: false },
      error: null,
    });

    const { startGoogleOAuth } = await import("./google-oauth");
    const result = await startGoogleOAuth({
      callbackURL: "https://account.khepree.com/dashboard",
      errorCallbackURL: "/sign-in?error=google_oauth_failed",
    });

    expect(result).toEqual({});
    expect(window.location.href).toBe("https://accounts.google.com/o/oauth2/auth");
  });

  it("returns error message from Better Auth", async () => {
    signInSocial.mockResolvedValue({
      data: null,
      error: { message: "oauth failed" },
    });

    const { startGoogleOAuth } = await import("./google-oauth");
    const result = await startGoogleOAuth({
      callbackURL: "/dashboard",
      errorCallbackURL: "/sign-in?error=google_oauth_failed",
    });

    expect(result).toEqual({ error: "oauth failed" });
  });
});
