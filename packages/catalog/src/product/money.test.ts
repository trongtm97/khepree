import { describe, expect, it } from "vitest";
import { MoneyError, moneyMinorToSafeNumber, parseMoneyMinor } from "@khepree/types";

describe("parseMoneyMinor", () => {
  it("accepts bigint minor units", () => {
    expect(parseMoneyMinor(1999n)).toBe(1999n);
  });

  it("accepts safe integer numbers", () => {
    expect(parseMoneyMinor(500)).toBe(500n);
  });

  it("accepts digit strings", () => {
    expect(parseMoneyMinor("12345")).toBe(12345n);
  });

  it("rejects negative and unsafe values", () => {
    expect(() => parseMoneyMinor(-1n)).toThrow(MoneyError);
    expect(() => parseMoneyMinor(1.5)).toThrow(MoneyError);
    expect(() => parseMoneyMinor("12.34")).toThrow(MoneyError);
  });
});

describe("moneyMinorToSafeNumber", () => {
  it("converts within safe integer range", () => {
    expect(moneyMinorToSafeNumber(999n)).toBe(999);
  });

  it("throws when exceeding Number.MAX_SAFE_INTEGER", () => {
    const tooLarge = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    expect(() => moneyMinorToSafeNumber(tooLarge)).toThrow(MoneyError);
  });
});
