import { formatPriceAmount } from "@khepree/catalog";

export function formatMoney(amountMinor: bigint, currency: string): string {
  return formatPriceAmount(amountMinor, currency, "en");
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}
