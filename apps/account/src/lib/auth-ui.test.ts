import { describe, expect, it } from "vitest";
import { accountMessages } from "./messages";
import { mapAuthError } from "./auth-ui";

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
