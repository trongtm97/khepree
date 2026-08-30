import { afterEach, describe, expect, it, vi } from "vitest";

describe("createEmailAdapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws in production when SMTP is incomplete", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("MAIL_FROM", "Khepree <no-reply@khepree.com>");
    vi.stubEnv("SMTP_HOST", "");

    const { createEmailAdapter } = await import("./adapter");
    expect(() => createEmailAdapter()).toThrow(/not configured/);
  });

  it("creates SMTP adapter when configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("MAIL_FROM", "Khepree <no-reply@khepree.com>");
    vi.stubEnv("MAIL_REPLY_TO", "support@khepree.com");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");

    const { createEmailAdapter } = await import("./adapter");
    const adapter = createEmailAdapter();
    expect(adapter.status).toBe("configured");
  });
});
