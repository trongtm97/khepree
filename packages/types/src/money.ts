/** Money stored as integer minor units — never float. */
export type MoneyMinor = bigint;

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** ISO 4217 minor-unit exponents. Unknown codes default to 2. */
const CURRENCY_EXPONENTS: Record<string, number> = {
  VND: 0,
  JPY: 0,
  KRW: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AUD: 2,
  CAD: 2,
  SGD: 2,
};

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function parseMoneyMinor(value: bigint | number | string): MoneyMinor {
  if (typeof value === "bigint") {
    if (value < 0n) throw new MoneyError("Money amount cannot be negative");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new MoneyError("Unsafe or invalid money amount");
    }
    return BigInt(value);
  }
  if (!/^\d+$/.test(value)) throw new MoneyError("Invalid money amount string");
  return BigInt(value);
}

/** Convert to number only when within JS safe integer range — for Intl formatting. */
export function moneyMinorToSafeNumber(value: MoneyMinor): number {
  if (value > MAX_SAFE) {
    throw new MoneyError("Amount exceeds safe Number range — use formatMoneyMinor instead");
  }
  return Number(value);
}

export function currencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

/** Parse a provider decimal string ("50000.00") into minor units without float. */
export function parseDecimalToMinor(value: string, currency: string): MoneyMinor {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new MoneyError("Invalid decimal money amount");
  }
  const exponent = currencyExponent(currency);
  const [whole = "0", fraction = ""] = value.split(".");
  if (exponent === 0) {
    if (fraction.replace(/0+$/, "") !== "") {
      throw new MoneyError("Zero-exponent currencies cannot have a non-zero fraction");
    }
    return parseMoneyMinor(whole);
  }
  const padded = fraction.padEnd(exponent, "0");
  if (padded.slice(exponent).replace(/0+$/, "") !== "") {
    throw new MoneyError("Too many fractional digits for currency");
  }
  const frac = padded.slice(0, exponent);
  return BigInt(whole) * 10n ** BigInt(exponent) + BigInt(frac || "0");
}

export function minorToDecimalString(amountMinor: MoneyMinor, currency: string): string {
  const exponent = currencyExponent(currency);
  const str = amountMinor.toString().padStart(exponent + 1, "0");
  if (exponent === 0) return str;
  return `${str.slice(0, -exponent)}.${str.slice(-exponent)}`;
}

export function formatMoneyMinor(
  amountMinor: MoneyMinor | string | number,
  currency: string,
  locale: string,
): string {
  const minor = typeof amountMinor === "bigint" ? amountMinor : parseMoneyMinor(amountMinor);
  const code = currency.toUpperCase();
  const exponent = currencyExponent(code);
  if (minor <= MAX_SAFE) {
    const major = moneyMinorToSafeNumber(minor) / 10 ** exponent;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(major);
  }
  return `${minorToDecimalString(minor, code)} ${code}`;
}

export interface MoneyAmount {
  amountMinor: MoneyMinor;
  currency: string;
}
