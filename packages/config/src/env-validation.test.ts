import { afterEach, describe, expect, it } from "vitest";
import { validatePaymentProviderConfiguration, validateRuntimeEnv } from "./env-validation";
import { getEnv } from "./env";

afterEach(() => {
  process.env.NODE_ENV = "test";
  process.env.NEXT_PHASE = "";
});

function productionBase() {
  return {
    NODE_ENV: "production" as const,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/khepree",
    BETTER_AUTH_SECRET: "prod-secret-with-enough-entropy-here",
    BETTER_AUTH_URL: "https://account.example.com",
    WEB_URL: "https://example.com",
    APP_URL: "https://app.example.com",
    ACCOUNT_URL: "https://account.example.com",
    ADMIN_URL: "https://admin.example.com",
    PARTNER_URL: "https://partner.example.com",
    API_URL: "https://api.example.com",
    S3_ENDPOINT: "https://s3.example.com",
    S3_REGION: "auto",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
    S3_BUCKET_PUBLIC: "khepree-public",
    S3_BUCKET_PRIVATE: "khepree-private",
    S3_PUBLIC_BASE_URL: "https://cdn.example.com",
    LICENSE_SIGNING_PRIVATE_KEY: "priv",
    LICENSE_SIGNING_PUBLIC_KEY: "pubk",
    MAIL_FROM: "Khepree <no-reply@khepree.com>",
    EMAIL_PROVIDER: "smtp" as const,
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    REDIS_URL: "redis://localhost:6379",
  };
}

describe("validateRuntimeEnv", () => {
  it("no-ops outside production", () => {
    expect(() => validateRuntimeEnv(getEnv({ NODE_ENV: "development" }))).not.toThrow();
  });

  it("skips Next.js production build phase", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          NODE_ENV: "production",
        }),
      ),
    ).not.toThrow();
  });

  it("rejects mock payment provider in production", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          PAYMENT_PROVIDER: "mock",
        }),
      ),
    ).toThrow(/PAYMENT_PROVIDER=mock/);
  });

  it("rejects sepay without credentials", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          PAYMENT_PROVIDER: "sepay",
        }),
      ),
    ).toThrow(/SEPAY_/);
  });

  it("rejects production DevPreview email", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          EMAIL_PROVIDER: "dev",
          PAYMENT_PROVIDER: "sepay",
          SEPAY_ENV: "sandbox",
          SEPAY_MERCHANT_ID: "m",
          SEPAY_SECRET_KEY: "s",
        }),
      ),
    ).toThrow(/EMAIL_PROVIDER=resend\|smtp/);
  });

  it("accepts production SMTP email", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          PAYMENT_PROVIDER: "sepay",
          SEPAY_ENV: "sandbox",
          SEPAY_MERCHANT_ID: "m",
          SEPAY_SECRET_KEY: "s",
        }),
      ),
    ).not.toThrow();
  });

  it("rejects production without REDIS_URL", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          REDIS_URL: undefined,
          PAYMENT_PROVIDER: "sepay",
          SEPAY_ENV: "sandbox",
          SEPAY_MERCHANT_ID: "m",
          SEPAY_SECRET_KEY: "s",
        }),
      ),
    ).toThrow(/REDIS_URL/);
  });

  it("rejects production without storage buckets", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          S3_BUCKET_PRIVATE: "",
          PAYMENT_PROVIDER: "sepay",
          SEPAY_ENV: "sandbox",
          SEPAY_MERCHANT_ID: "m",
          SEPAY_SECRET_KEY: "s",
        }),
      ),
    ).toThrow(/bucket configuration/);
  });

  it("rejects http public media base URL", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          S3_PUBLIC_BASE_URL: "http://cdn.example.com",
          PAYMENT_PROVIDER: "sepay",
          SEPAY_ENV: "sandbox",
          SEPAY_MERCHANT_ID: "m",
          SEPAY_SECRET_KEY: "s",
        }),
      ),
    ).toThrow(/HTTPS/);
  });

  it("rejects S3 endpoint matching CDN hostname", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          ...productionBase(),
          S3_ENDPOINT: "https://cdn.example.com",
          S3_PUBLIC_BASE_URL: "https://cdn.example.com",
          PAYMENT_PROVIDER: "sepay",
          SEPAY_ENV: "sandbox",
          SEPAY_MERCHANT_ID: "m",
          SEPAY_SECRET_KEY: "s",
        }),
      ),
    ).toThrow(/S3_ENDPOINT must be the Vietnix S3 API endpoint/);
  });
});

describe("validatePaymentProviderConfiguration", () => {
  it("allows mock outside production", () => {
    expect(() =>
      validatePaymentProviderConfiguration(getEnv({ NODE_ENV: "development", PAYMENT_PROVIDER: "mock" })),
    ).not.toThrow();
  });
});
