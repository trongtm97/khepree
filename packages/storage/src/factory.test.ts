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
    vi.stubEnv("MAIL_FROM", "Khepree <no-reply@example.com>");
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("PAYMENT_PROVIDER", "sepay");
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "secret");
    vi.stubEnv("S3_ENDPOINT", "https://s3.example.com");
    vi.stubEnv("S3_ACCESS_KEY_ID", "key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("S3_BUCKET_PUBLIC", "public-bucket");
    vi.stubEnv("S3_BUCKET_PRIVATE", "");
    vi.stubEnv("S3_PUBLIC_BASE_URL", "https://cdn.example.com");

    const { getPrivateObjectStorage } = await import("./factory");
    expect(() => getPrivateObjectStorage()).toThrow(
      /bucket configuration is required in production|Private object storage is not configured/,
    );
  });

  it("uses mock storage in development when storage is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("S3_ENDPOINT", "");
    vi.stubEnv("S3_BUCKET_PUBLIC", "");
    vi.stubEnv("S3_BUCKET_PRIVATE", "");

    const { getPrivateObjectStorage } = await import("./factory");
    const storage = getPrivateObjectStorage();
    expect(storage.provider).toBe("mock");
  });
});
