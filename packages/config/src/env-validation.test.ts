import { afterEach, describe, expect, it } from "vitest";
import { EnvValidationError, validateRuntimeEnv } from "./env-validation";
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

  it("requires production secrets", () => {
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
        }),
      ),
    ).toThrow(EnvValidationError);
  });
});
