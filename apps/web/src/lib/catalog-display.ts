import type { PublicPlan, PublicPrice } from "@khepree/catalog";
import { formatPriceAmount, selectDisplayPrice } from "@khepree/catalog";
import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION } from "@khepree/config";
import { getMessages } from "@/lib/i18n/get-messages";
import type { SupportedLocale } from "@/lib/i18n/config";

/** Human plan period — no billing jargon or provider names. */
export function formatPublicPlanPeriod(
  plan: PublicPlan,
  price: PublicPrice | null,
  locale: SupportedLocale,
): string | null {
  const { catalog } = getMessages(locale);
  if (plan.pricingMode === "free") return catalog.free;
  if (plan.pricingMode === "contact_sales") return catalog.contactSales;
  if (plan.billingType === "perpetual" || plan.pricingMode === "perpetual") {
    return catalog.billing.perpetual;
  }
  const interval = price?.interval?.toLowerCase() ?? null;
  if (interval === "month") return catalog.periods.month;
  if (interval === "year") return catalog.periods.year;
  if (plan.billingType === "one_time") return catalog.billing.one_time;
  return null;
}

export function selectPublicDisplayPrice(
  plan: PublicPlan,
  preferredCurrency = DEFAULT_CURRENCY,
  preferredRegion: string | null = DEFAULT_MARKET_REGION,
): PublicPrice | null {
  return selectDisplayPrice(plan.prices, {
    currency: preferredCurrency,
    region: preferredRegion,
    defaultCurrency: DEFAULT_CURRENCY,
  });
}

export function formatPublicPlanPrice(
  plan: PublicPlan,
  locale: SupportedLocale,
  preferredCurrency = DEFAULT_CURRENCY,
  preferredRegion: string | null = DEFAULT_MARKET_REGION,
): { amount: string | null; period: string | null } {
  const price = selectPublicDisplayPrice(plan, preferredCurrency, preferredRegion);
  const period = formatPublicPlanPeriod(plan, price, locale);
  if (plan.pricingMode === "free") return { amount: null, period };
  if (plan.pricingMode === "contact_sales") return { amount: null, period };
  if (!price) return { amount: null, period: null };
  return {
    amount: formatPriceAmount(price.amountMinor, price.currency, locale),
    period,
  };
}

export function formatPublicStartingPrice(
  amountMinor: string,
  currency: string,
  interval: string | null,
  locale: SupportedLocale,
): { amount: string; period: string | null } {
  const { catalog } = getMessages(locale);
  const amount = formatPriceAmount(amountMinor, currency, locale);
  const normalized = interval?.toLowerCase() ?? null;
  let period: string | null = null;
  if (normalized === "month") period = catalog.periods.month;
  else if (normalized === "year") period = catalog.periods.year;
  return { amount, period };
}
