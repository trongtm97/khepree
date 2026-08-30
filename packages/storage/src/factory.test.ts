import { afterEach, describe, expect, it, vi } from "vitest";
import { resetObjectStorageForTests } from "./factory";

describe("storage factory production fail-fast", () => {
  afterEach(() => {
    resetObjectStorageForTests();
    vi.unstubAllEnvs();
  });

  it("throws when private bucket missing in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/khepree");
    vi.stubEnv("BETTER_AUTH_SECRET", "prod-secret-with-enough-entropy-here");
    vi.stubEnv("BETTER_AUTH_URL", "https://account.example.com");
    vi.stubEnv("APP_URL", "https://example.com");
    vi.stubEnv("WEB_URL", "https://example.com");
    vi.stubEnv("ACCOUNT_URL", "https://account.example.com");
    vi.stubEnv("ADMIN_URL", "https://admin.example.com");
    vi.stubEnv("PARTNER_URL", "https://partner.example.com");
    vi.stubEnv("API_URL", "https://api.example.com");
    vi.stubEnv("LICENSE_SIGNING_PRIVATE_KEY", "dGVzdA==");
    vi.stubEnv("LICENSE_SIGNING_PUBLIC_KEY", "dGVzdA==");
    vi.stubEnv("EMAIL_FROM", "Khepree <no-reply@example.com>");
    vi.stubEnv("EMAIL_PROVIDER_API_KEY", "email-key");
    vi.stubEnv("MOCK_PAYMENT_WEBHOOK_SECRET", "webhook-secret-not-change-me");
    vi.stubEnv("R2_ACCOUNT_ID", "acct");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("R2_BUCKET_PUBLIC", "public-bucket");
    vi.stubEnv("R2_BUCKET_PRIVATE", "");

    const { getPrivateObjectStorage } = await import("./factory");
    expect(() => getPrivateObjectStorage()).toThrow(
      /R2 public and private bucket configuration is required in production|Private R2 bucket is not configured/,
    );
  });

  it("uses mock storage in development when R2 is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("R2_BUCKET_PUBLIC", "");
    vi.stubEnv("R2_BUCKET_PRIVATE", "");

    const { getPrivateObjectStorage } = await import("./factory");
    const storage = getPrivateObjectStorage();
    expect(storage.provider).toBe("mock");
  });
});
