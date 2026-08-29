import { formatPriceAmount } from "@khepree/catalog";

export function formatMoney(amountMinor: bigint, currency: string): string {
  return formatPriceAmount(amountMinor, currency, "en");
}
