import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION } from "@khepree/config";

/** Server-side market for price selection. Not geo-IP. Account/config driven. */
export interface MarketContext {
  currency: string;
  region: string | null;
}

export function defaultMarket(): MarketContext {
  return { currency: DEFAULT_CURRENCY, region: DEFAULT_MARKET_REGION };
}

/**
 * A checkout price must be active and match the market currency.
 * Region-specific rows must match; region-null prices are allowed for that currency.
 */
export function isPriceAllowedForMarket(
  price: { currency: string; region: string | null; isActive: boolean },
  market: MarketContext = defaultMarket(),
): boolean {
  if (!price.isActive) return false;
  if (price.currency.toUpperCase() !== market.currency.toUpperCase()) return false;
  if (price.region && market.region && price.region !== market.region) return false;
  return true;
}
