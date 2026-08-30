import type { PublicPlan } from "@khepree/catalog";
import { isPurchasableBillingType } from "@khepree/catalog";
import { buttonClassName, Card, CardDescription, CardTitle, cn } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import type { SupportedLocale } from "@/lib/i18n/config";
import { formatPublicPlanPrice, selectPublicDisplayPrice } from "@/lib/catalog-display";

function formatFeatureValue(
  feature: PublicPlan["features"][number],
  messages: Messages,
): string {
  switch (feature.value.valueType) {
    case "boolean":
      return feature.value.booleanValue ? messages.catalog.included : messages.catalog.notIncluded;
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
  accountUrl,
  featured,
  preferredCurrency,
  preferredRegion,
}: {
  plan: PublicPlan;
  locale: SupportedLocale;
  messages: Messages;
  accountUrl?: string;
  featured?: boolean;
  preferredCurrency?: string;
  preferredRegion?: string | null;
}) {
  const price = selectPublicDisplayPrice(plan, preferredCurrency, preferredRegion);
  const { amount, period } = formatPublicPlanPrice(plan, locale, preferredCurrency, preferredRegion);
  const checkoutHref =
    accountUrl && price && isPurchasableBillingType(plan.billingType)
      ? `${accountUrl}/checkout?plan=${encodeURIComponent(plan.publicId)}&price=${encodeURIComponent(price.publicId)}`
      : null;

  return (
    <Card
      className={cn(
        "flex h-full flex-col border-border p-6",
        featured && "border-teal/40 shadow-[var(--shadow-elevated)] ring-1 ring-teal/20",
      )}
    >
      <CardTitle className="text-xl">{plan.name}</CardTitle>

      <div className="mt-5 min-h-[3.5rem]">
        {period && !amount ? (
          <p className="text-3xl font-semibold tracking-tight text-foreground">{period}</p>
        ) : amount ? (
          <>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{amount}</p>
            {period ? <p className="mt-1 text-sm font-medium text-teal">{period}</p> : null}
          </>
        ) : (
          <p className="text-lg text-muted">{messages.catalog.priceUnavailable}</p>
        )}
      </div>

      {plan.features.length > 0 ? (
        <ul className="mt-6 space-y-2.5 border-t border-border-subtle pt-6 text-sm text-muted">
          {plan.features.map((feature) => (
            <li key={feature.key} className="flex justify-between gap-3">
              <span>{feature.name}</span>
              <span className="font-medium text-foreground">{formatFeatureValue(feature, messages)}</span>
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
            className={buttonClassName({ variant: "accent", size: "md", fullWidthMobile: true, className: "w-full" })}
          >
            {messages.catalog.checkout}
          </a>
        </div>
      ) : plan.pricingMode === "contact_sales" ? (
        <p className="mt-auto pt-6 text-sm font-medium text-muted">{messages.catalog.contactSales}</p>
      ) : (
        <div className="mt-auto" />
      )}
    </Card>
  );
}
