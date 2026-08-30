import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@khepree/config";
import {
  currencyExponent,
  formatMoneyMinor,
  moneyMinorToSafeNumber,
  parseMoneyMinor,
} from "@khepree/types";
import type { PlanBillingType, PricingDisplayMode, PublicPrice } from "./types";

/** @deprecated Use currencyExponent from @khepree/types. */
export const currencyMinorUnits = currencyExponent;

export function minorToMajor(amountMinor: bigint, currency: string): number {
  const exponent = currencyExponent(currency);
  return moneyMinorToSafeNumber(amountMinor) / 10 ** exponent;
}

export function formatPriceAmount(
  amountMinor: bigint | string | number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const minor = typeof amountMinor === "bigint" ? amountMinor : parseMoneyMinor(amountMinor);
  return formatMoneyMinor(minor, currency, locale);
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

export function formatBillingInterval(interval: string | null, locale = DEFAULT_LOCALE): string | null {
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
