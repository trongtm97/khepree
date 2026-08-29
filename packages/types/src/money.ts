/** Money stored as integer minor units — never float. */
export type MoneyMinor = bigint;

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

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

export interface MoneyAmount {
  amountMinor: MoneyMinor;
  currency: string;
}
