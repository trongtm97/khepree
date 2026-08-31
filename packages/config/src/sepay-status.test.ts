import { describe, expect, it } from "vitest";
import { getSepayIntegrationStatus, maskIntegrationSecret } from "./sepay-status";

describe("sepay-status", () => {
  it("masks merchant id tail", () => {
    expect(maskIntegrationSecret("merchant_abc1234")).toMatch(/1234$/);
  });

  it("builds IPN url from API_URL", () => {
    const status = getSepayIntegrationStatus({
      PAYMENT_PROVIDER: "sepay",
      SEPAY_ENV: "sandbox",
      SEPAY_MERCHANT_ID: "m_test",
      SEPAY_SECRET_KEY: "secret",
      API_URL: "https://api.khepree.com",
    } as never);
    expect(status.ipnUrl).toBe("https://api.khepree.com/api/v1/webhooks/payments/sepay");
    expect(status.configured).toBe(true);
  });

  it("flags missing credentials", () => {
    const status = getSepayIntegrationStatus({
      PAYMENT_PROVIDER: "sepay",
      SEPAY_ENV: "sandbox",
    } as never);
    expect(status.configured).toBe(false);
    expect(status.missing.length).toBeGreaterThan(0);
  });
});
