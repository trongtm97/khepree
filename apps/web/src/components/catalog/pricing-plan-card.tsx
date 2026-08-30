import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION } from "@khepree/config";
import type { PublicPlan } from "@khepree/catalog";
import {
  formatBillingInterval,
  formatPriceAmount,
  isPurchasableBillingType,
  selectDisplayPrice,
} from "@khepree/catalog";
import { Badge, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import type { SupportedLocale } from "@/lib/i18n/config";

function formatFeatureValue(
  feature: PublicPlan["features"][number],
  messages: Messages,
): string {
  switch (feature.value.valueType) {
    case "boolean":
      return feature.value.booleanValue
        ? messages.catalog.included
        : messages.catalog.notIncluded;
    case "integer":
      return String(feature.value.integerValue);
    case "string":
      return feature.value.stringValue;
    default: {
      const _exhaustive: never = feature.value;
      return String(_exhaustive);
    }
  }
}

export function PricingPlanCard({
  plan,
  locale,
  messages,
  preferredCurrency,
  preferredRegion,
  accountUrl,
}: {
  plan: PublicPlan;
  locale: SupportedLocale;
  messages: Messages;
  preferredCurrency?: string;
  preferredRegion?: string | null;
  accountUrl?: string;
}) {
  const price = selectDisplayPrice(plan.prices, {
    currency: preferredCurrency ?? DEFAULT_CURRENCY,
    region: preferredRegion ?? DEFAULT_MARKET_REGION,
    defaultCurrency: DEFAULT_CURRENCY,
  });
  const interval = price ? formatBillingInterval(price.interval, locale) : null;
  const checkoutHref =
    accountUrl && price && isPurchasableBillingType(plan.billingType)
      ? `${accountUrl}/checkout?plan=${encodeURIComponent(plan.publicId)}&price=${encodeURIComponent(price.publicId)}`
      : null;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <Badge variant="outline">{messages.catalog.billing[plan.pricingMode]}</Badge>
      </div>

      <div className="mt-4 text-2xl font-semibold tracking-tight">
        {plan.pricingMode === "free" ? (
          messages.catalog.free
        ) : plan.pricingMode === "contact_sales" ? (
          messages.catalog.contactSales
        ) : price ? (
          <>
            {formatPriceAmount(price.amountMinor, price.currency, locale)}
            {interval ? <span className="text-base font-normal text-khepree-slate/70">{interval}</span> : null}
          </>
        ) : (
          messages.catalog.priceUnavailable
        )}
      </div>

      {plan.features.length > 0 ? (
        <ul className="mt-6 space-y-2 text-sm text-khepree-slate/80">
          {plan.features.map((feature) => (
            <li key={feature.key} className="flex justify-between gap-3">
              <span>{feature.name}</span>
              <span className="font-medium">{formatFeatureValue(feature, messages)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <CardDescription className="mt-6">{messages.catalog.noFeaturesListed}</CardDescription>
      )}

      {checkoutHref ? (
        <div className="mt-auto pt-6">
          <a
            href={checkoutHref}
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-khepree-teal px-5 text-sm font-medium text-khepree-white shadow-sm shadow-khepree-teal/20 transition-colors hover:bg-khepree-teal/90"
          >
            {messages.catalog.checkout}
          </a>
        </div>
      ) : plan.pricingMode === "contact_sales" ? (
        <p className="mt-auto pt-6 text-sm font-medium text-khepree-slate/70">{messages.catalog.contactSales}</p>
      ) : (
        <div className="mt-auto" />
      )}
    </Card>
  );
}
