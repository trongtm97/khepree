import { afterEach, describe, expect, it } from "vitest";
import { getTrustedOrigins } from "./email";

const keys = [
  "BETTER_AUTH_URL",
  "ACCOUNT_URL",
  "WEB_URL",
  "APP_URL",
  "ADMIN_URL",
  "PARTNER_URL",
] as const;

afterEach(() => {
  for (const key of keys) delete process.env[key];
});

describe("getTrustedOrigins", () => {
  it("includes marketing WEB_URL when set", () => {
    process.env.BETTER_AUTH_URL = "https://account.khepree.com";
    process.env.WEB_URL = "https://khepree.com";
    expect(getTrustedOrigins()).toEqual(
      expect.arrayContaining(["https://account.khepree.com", "https://khepree.com"]),
    );
  });
});
