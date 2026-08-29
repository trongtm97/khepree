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

export function minorToMajor(amountMinor: number, currency: string): number {
  const exponent = currencyMinorUnits(currency);
  return amountMinor / 10 ** exponent;
}

export function formatPriceAmount(
  amountMinor: number,
  currency: string,
  locale = "en",
): string {
  const major = minorToMajor(amountMinor, currency);
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

export function selectDisplayPrice(
  prices: PublicPrice[],
  options: { currency?: string; region?: string | null } = {},
): PublicPrice | null {
  const active = prices.filter((price) => price.isActive);
  if (active.length === 0) return null;

  const { currency, region } = options;

  if (currency && region) {
    const match = active.find(
      (price) =>
        price.currency.toUpperCase() === currency.toUpperCase() && price.region === region,
    );
    if (match) return match;
  }

  if (currency) {
    const match = active.find(
      (price) => price.currency.toUpperCase() === currency.toUpperCase() && !price.region,
    );
    if (match) return match;

    const anyCurrency = active.find(
      (price) => price.currency.toUpperCase() === currency.toUpperCase(),
    );
    if (anyCurrency) return anyCurrency;
  }

  return active.find((price) => !price.region) ?? active[0] ?? null;
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
