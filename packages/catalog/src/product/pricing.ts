import { DEFAULT_CURRENCY } from "@khepree/config";
import { moneyMinorToSafeNumber } from "@khepree/types";
import type { PlanBillingType, PricingDisplayMode, PublicPrice } from "./types";

/** ISO 4217 minor-unit exponents for common currencies; default 2 for unknown. */
const CURRENCY_MINOR_UNITS: Record<string, number> = {
  USD: 2,
  VND: 0,
  EUR: 2,
  GBP: 2,
  JPY: 0,
};

export function currencyMinorUnits(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

export function minorToMajor(amountMinor: bigint, currency: string): number {
  const exponent = currencyMinorUnits(currency);
  return moneyMinorToSafeNumber(amountMinor) / 10 ** exponent;
}

export function formatPriceAmount(
  amountMinor: bigint | string | number,
  currency: string,
  locale = "en",
): string {
  const minor = typeof amountMinor === "bigint" ? amountMinor : BigInt(amountMinor);
  const major = minorToMajor(minor, currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).format(major);
}

export function resolvePricingDisplayMode(billingType: PlanBillingType): PricingDisplayMode {
  switch (billingType) {
    case "free":
      return "free";
    case "recurring":
      return "recurring";
    case "one_time":
      return "one_time";
    case "perpetual":
      return "perpetual";
    case "custom":
      return "contact_sales";
    default: {
      const _exhaustive: never = billingType;
      throw new Error(`Unknown billing type: ${_exhaustive}`);
    }
  }
}

interface PriceSelectionOptions {
  currency?: string;
  region?: string | null;
  defaultCurrency?: string;
}

function rankPrice(price: PublicPrice, options: PriceSelectionOptions): number {
  const currency = options.currency?.toUpperCase();
  const defaultCurrency = (options.defaultCurrency ?? DEFAULT_CURRENCY).toUpperCase();
  let score = 0;
  if (currency && price.currency.toUpperCase() === currency && price.region === options.region) {
    score += 100;
  } else if (currency && price.currency.toUpperCase() === currency && !price.region) {
    score += 80;
  } else if (currency && price.currency.toUpperCase() === currency) {
    score += 60;
  } else if (price.currency.toUpperCase() === defaultCurrency && !price.region) {
    score += 40;
  } else if (!price.region) {
    score += 20;
  }
  return score;
}

/** Deterministic price selection — never `activePrices[0]`. */
export function selectDisplayPrice(
  priceList: PublicPrice[],
  options: PriceSelectionOptions = {},
): PublicPrice | null {
  const active = priceList.filter((price) => price.isActive);
  if (active.length === 0) return null;

  const ranked = [...active].sort((a, b) => {
    const scoreDiff = rankPrice(b, options) - rankPrice(a, options);
    if (scoreDiff !== 0) return scoreDiff;
    const currencyDiff = a.currency.localeCompare(b.currency);
    if (currencyDiff !== 0) return currencyDiff;
    const regionDiff = (a.region ?? "").localeCompare(b.region ?? "");
    if (regionDiff !== 0) return regionDiff;
    return a.publicId.localeCompare(b.publicId);
  });

  return ranked[0] ?? null;
}

export function formatBillingInterval(interval: string | null, locale = "en"): string | null {
  if (!interval) return null;
  const normalized = interval.toLowerCase();
  if (normalized === "month") {
    return locale === "vi" ? "/ tháng" : "/ month";
  }
  if (normalized === "year") {
    return locale === "vi" ? "/ năm" : "/ year";
  }
  return `/${interval}`;
}
