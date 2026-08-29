import { describe, expect, it } from "vitest";
import { verificationEmailContent, resetPasswordEmailContent } from "./email";

describe("auth email content", () => {
  it("builds verification email with url", () => {
    const content = verificationEmailContent("http://localhost:3001/verify?token=abc", "Alex");
    expect(content.subject).toContain("Verify");
    expect(content.text).toContain("http://localhost:3001/verify?token=abc");
    expect(content.html).toContain("Alex");
  });

  it("builds reset password email", () => {
    const content = resetPasswordEmailContent("http://localhost:3001/reset?token=xyz", null);
    expect(content.subject).toContain("Reset");
    expect(content.text).toContain("xyz");
  });
});
