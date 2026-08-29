import type { WalletTxType } from "./types";
import { PartnerError } from "./errors";

export function signedLedgerDelta(type: WalletTxType, amountMinor: bigint, adjustmentNegative = false): bigint {
  if (amountMinor < 0n) {
    throw new PartnerError("INVALID_AMOUNT", "Ledger amount must be non-negative");
  }
  switch (type) {
    case "CREDIT":
    case "REFUND":
      return amountMinor;
    case "DEBIT":
      return -amountMinor;
    case "ADJUSTMENT":
      return adjustmentNegative ? -amountMinor : amountMinor;
    case "REVERSAL":
      return -amountMinor;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
