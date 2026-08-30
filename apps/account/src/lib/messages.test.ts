import { describe, expect, it } from "vitest";
import { accountMessages } from "./messages";

const ENGLISH_LEAKS = [
  "Sign in",
  "Forgot password?",
  "Create account",
  "Back to sign in",
  "Forgot password",
  "Verify your email",
  "Set new password",
  "Loading…",
];

describe("accountMessages vi auth", () => {
  const auth = accountMessages("vi").auth;
  const serialized = JSON.stringify(auth);

  it("does not leak common English auth UI strings", () => {
    for (const leak of ENGLISH_LEAKS) {
      expect(serialized).not.toContain(leak);
    }
  });

  it("uses Vietnamese primary actions", () => {
    expect(auth.signIn).toBe("Đăng nhập");
    expect(auth.signUp).toBe("Tạo tài khoản");
    expect(auth.forgotPassword).toBe("Quên mật khẩu?");
  });
});
