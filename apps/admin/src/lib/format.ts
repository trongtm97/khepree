import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@khepree/config";
import { formatPriceAmount } from "@khepree/catalog";
import { labelStatus } from "./labels";

export { DEFAULT_CURRENCY, DEFAULT_LOCALE };

export function formatMoney(amountMinor: bigint, currency: string): string {
  return formatPriceAmount(amountMinor, currency, DEFAULT_LOCALE);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatCommerceStatus(status: string): string {
  return labelStatus(status);
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}

/** Prefer public-facing identifier over raw UUID in tables. */
export function displayId(primary: string | null | undefined, fallback?: string): string {
  return primary?.trim() || fallback?.trim() || "—";
}
