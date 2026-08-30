import { describe, expect, it } from "vitest";
import { CommerceError } from "./errors";
import { assertOrderTransition, canTransitionOrder } from "./order-state";

describe("assertOrderTransition", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionOrder("draft", "pending_payment")).toBe(true);
    expect(canTransitionOrder("pending_payment", "paid")).toBe(true);
    expect(canTransitionOrder("paid", "partially_refunded")).toBe(true);
    expect(canTransitionOrder("pending_payment", "voided")).toBe(true);
    expect(canTransitionOrder("paid", "voided")).toBe(true);
    expect(canTransitionOrder("voided", "paid")).toBe(false);
  });

  it("blocks invalid transitions", () => {
    expect(() => assertOrderTransition("draft", "refunded")).toThrow(CommerceError);
    expect(() => assertOrderTransition("paid", "cancelled")).toThrow(CommerceError);
    expect(() => assertOrderTransition("cancelled", "pending_payment")).toThrow(CommerceError);
  });
});
