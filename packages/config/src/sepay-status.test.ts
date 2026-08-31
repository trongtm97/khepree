import { describe, expect, it } from "vitest";
import { getSepayIntegrationStatus, maskIntegrationSecret } from "./sepay-status";

describe("sepay-status", () => {
  it("masks account number tail", () => {
    expect(maskIntegrationSecret("0123456789")).toMatch(/6789$/);
  });

  it("builds webhook url from API_URL", () => {
    const status = getSepayIntegrationStatus({
      PAYMENT_PROVIDER: "sepay",
      SEPAY_BANK_CODE: "MBBank",
      SEPAY_BANK_ACCOUNT_NUMBER: "0123456789",
      SEPAY_BANK_ACCOUNT_NAME: "KHEPREE",
      SEPAY_WEBHOOK_SECRET: "secret",
      API_URL: "https://api.khepree.com",
    } as never);
    expect(status.webhookUrl).toBe("https://api.khepree.com/api/v1/webhooks/payments/sepay");
    expect(status.configured).toBe(true);
  });

  it("flags missing credentials", () => {
    const status = getSepayIntegrationStatus({
      PAYMENT_PROVIDER: "sepay",
    } as never);
    expect(status.configured).toBe(false);
    expect(status.missing.length).toBeGreaterThan(0);
  });
});
