import { describe, expect, it } from "vitest";
import { accountMessages } from "./messages";
import { mapAuthError, mapOAuthCallbackError } from "./auth-ui";

describe("mapAuthError", () => {
  const copy = accountMessages("vi").auth;

  it("maps invalid credentials", () => {
    expect(mapAuthError("Invalid email or password", copy)).toBe(copy.errors.invalidCredentials);
  });

  it("maps duplicate email", () => {
    expect(mapAuthError("User already exists", copy)).toBe(copy.errors.emailExists);
  });

  it("falls back to generic for unknown errors", () => {
    expect(mapAuthError("INTERNAL_SERVER_ERROR", copy)).toBe(copy.errors.generic);
  });
});

describe("mapOAuthCallbackError", () => {
  const copy = accountMessages("vi").auth;

  it("maps access_denied to cancelled copy", () => {
    expect(mapOAuthCallbackError("access_denied", copy)).toBe(copy.errors.googleCancelled);
  });

  it("maps account_not_linked", () => {
    expect(mapOAuthCallbackError("account_not_linked", copy)).toBe(copy.errors.accountNotLinked);
  });

  it("returns null when no error", () => {
    expect(mapOAuthCallbackError(null, copy)).toBeNull();
  });
});
