import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE } from "@khepree/config";
import { renderTransactionalEmail, transactionalTemplate } from "./templates";

describe("transactional templates", () => {
  it("defaults to Vietnamese", () => {
    expect(DEFAULT_LOCALE).toBe("vi");
    expect(transactionalTemplate("payment_confirmed").subject).toBe("Thanh toán thành công");
    expect(renderTransactionalEmail("verify_email").subject).toContain("Xác minh");
  });

  it("keeps English as a secondary locale", () => {
    expect(transactionalTemplate("payment_confirmed", "en").subject).toBe("Payment confirmed");
    expect(renderTransactionalEmail("order_receipt", "en").text).toMatch(/receipt/i);
  });
});
