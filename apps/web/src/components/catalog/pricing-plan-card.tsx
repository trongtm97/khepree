import type { PublicPlan } from "@khepree/catalog";
import {
  formatBillingInterval,
  formatPriceAmount,
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
}: {
  plan: PublicPlan;
  locale: SupportedLocale;
  messages: Messages;
  preferredCurrency?: string;
}) {
  const price = selectDisplayPrice(plan.prices, { currency: preferredCurrency });
  const interval = price ? formatBillingInterval(price.interval, locale) : null;

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
    </Card>
  );
}
