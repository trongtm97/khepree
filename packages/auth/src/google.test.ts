import { afterEach, describe, expect, it } from "vitest";
import { isGoogleAuthConfigured } from "./google";

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
});

describe("isGoogleAuthConfigured", () => {
  it("is false when credentials are missing", () => {
    expect(isGoogleAuthConfigured()).toBe(false);
  });

  it("is true when both credentials are set", () => {
    process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it("is false for CHANGE_ME placeholders", () => {
    process.env.GOOGLE_CLIENT_ID = "CHANGE_ME";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isGoogleAuthConfigured()).toBe(false);
  });
});
