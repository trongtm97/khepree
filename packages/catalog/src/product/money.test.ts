import { describe, expect, it } from "vitest";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@khepree/config";
import {
  MoneyError,
  currencyExponent,
  formatMoneyMinor,
  moneyMinorToSafeNumber,
  parseDecimalToMinor,
  parseMoneyMinor,
} from "@khepree/types";

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

describe("currencyExponent and formatMoneyMinor", () => {
  it("uses exponent 0 for VND and 2 for USD", () => {
    expect(currencyExponent("VND")).toBe(0);
    expect(currencyExponent("USD")).toBe(2);
    expect(DEFAULT_CURRENCY).toBe("VND");
    expect(DEFAULT_LOCALE).toBe("vi");
  });

  it("formats VND without fractional digits and USD with cents", () => {
    expect(formatMoneyMinor(599000n, "VND", "vi-VN")).toMatch(/599/);
    expect(formatMoneyMinor(599000n, "VND", "vi-VN")).not.toMatch(/599000[,.]00/);
    expect(formatMoneyMinor(1999n, "USD", "en")).toContain("19.99");
  });

  it("round-trips provider decimal strings without float", () => {
    expect(parseDecimalToMinor("599000", "VND")).toBe(599000n);
    expect(parseDecimalToMinor("599000.00", "VND")).toBe(599000n);
    expect(parseDecimalToMinor("19.99", "USD")).toBe(1999n);
    expect(parseDecimalToMinor("50.00", "USD")).toBe(5000n);
    expect(() => parseDecimalToMinor("599000.50", "VND")).toThrow(MoneyError);
  });

  it("formats BIGINT values beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = BigInt(Number.MAX_SAFE_INTEGER) + 123n;
    const formatted = formatMoneyMinor(huge, "VND", "vi-VN");
    expect(formatted).toContain(huge.toString());
  });
});
