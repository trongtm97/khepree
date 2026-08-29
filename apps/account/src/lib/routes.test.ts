import { describe, expect, it } from "vitest";
import {
  AUTH_ROUTES,
  isProtectedPath,
  isPublicAuthPath,
  PROTECTED_ROUTES,
} from "./routes";

describe("account routes", () => {
  it("marks dashboard and nested account paths as protected", () => {
    expect(isProtectedPath(PROTECTED_ROUTES.dashboard)).toBe(true);
    expect(isProtectedPath("/profile")).toBe(true);
    expect(isProtectedPath("/products/extra")).toBe(true);
    expect(isProtectedPath("/checkout")).toBe(true);
    expect(isProtectedPath("/checkout/mock/ord_x")).toBe(true);
  });

  it("does not treat auth pages as protected", () => {
    expect(isProtectedPath(AUTH_ROUTES.signIn)).toBe(false);
    expect(isProtectedPath(AUTH_ROUTES.signUp)).toBe(false);
  });

  it("recognizes public auth paths", () => {
    expect(isPublicAuthPath(AUTH_ROUTES.forgotPassword)).toBe(true);
    expect(isPublicAuthPath(AUTH_ROUTES.resetPassword)).toBe(true);
    expect(isPublicAuthPath("/dashboard")).toBe(false);
  });
});
