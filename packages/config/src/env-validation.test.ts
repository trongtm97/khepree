import { afterEach, describe, expect, it } from "vitest";
import { validateRuntimeEnv } from "./env-validation";
import { getEnv } from "./env";

afterEach(() => {
  process.env.NODE_ENV = "test";
  process.env.NEXT_PHASE = "";
});

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

  it("requires SePay credentials in production", () => {
    process.env.NEXT_PHASE = "";
    expect(() =>
      validateRuntimeEnv(
        getEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://user:pass@localhost:5432/khepree",
          BETTER_AUTH_SECRET: "prod-secret-with-enough-entropy-here",
          BETTER_AUTH_URL: "https://account.example.com",
          APP_URL: "https://example.com",
          ACCOUNT_URL: "https://account.example.com",
          ADMIN_URL: "https://admin.example.com",
          PARTNER_URL: "https://partner.example.com",
          API_URL: "https://api.example.com",
          R2_ACCOUNT_ID: "acct",
          R2_ACCESS_KEY_ID: "key",
          R2_SECRET_ACCESS_KEY: "secret",
          R2_BUCKET_PUBLIC: "pub",
          R2_BUCKET_PRIVATE: "prv",
          LICENSE_SIGNING_PRIVATE_KEY: "priv",
          LICENSE_SIGNING_PUBLIC_KEY: "pubk",
          EMAIL_FROM: "Khepree <no-reply@khepree.com>",
          EMAIL_PROVIDER_API_KEY: "email-key",
          PAYMENT_PROVIDER: "mock",
        }),
      ),
    ).toThrow(/PAYMENT_PROVIDER=sepay/);
  });
});
