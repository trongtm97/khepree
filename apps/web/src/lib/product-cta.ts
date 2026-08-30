import { isPurchasableBillingType, type PublicProductDetail } from "@khepree/catalog";
import { accountSignUpUrl } from "@khepree/config";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export interface ProductPrimaryCta {
  href: string;
  label: string;
  external?: boolean;
}

function resolveHref(locale: SupportedLocale, href: string): ProductPrimaryCta["href"] {
  if (href.startsWith("http") || href.startsWith("#")) return href;
  return localePath(locale, href);
}

/** Product-scoped primary action — never falls back to global /pricing. */
export function resolveProductPrimaryCta(
  product: PublicProductDetail,
  locale: SupportedLocale,
  messages: Messages,
  accountUrl?: string,
): ProductPrimaryCta {
  const { marketing } = product;
  const pricingAnchor = "#pricing";

  if (product.plans.length > 0) {
    const hasPurchasable = product.plans.some(
      (plan) => isPurchasableBillingType(plan.billingType) && plan.prices.some((price) => price.isActive),
    );
    if (hasPurchasable) {
      return { href: pricingAnchor, label: messages.catalog.viewPlans };
    }
    if (product.plans.some((plan) => plan.pricingMode === "contact_sales")) {
      return { href: localePath(locale, "/contact"), label: messages.catalog.contactSales };
    }
    if (product.plans.every((plan) => plan.pricingMode === "free")) {
      return { href: accountSignUpUrl(), label: messages.catalog.getStarted, external: true };
    }
  }

  if (marketing.cta?.buttonHref && marketing.cta.buttonLabel) {
    const href = resolveHref(locale, marketing.cta.buttonHref);
    return {
      href,
      label: marketing.cta.buttonLabel,
      external: href.startsWith("http"),
    };
  }

  if (accountUrl) {
    return { href: `${accountUrl}/sign-up`, label: messages.catalog.getStarted, external: true };
  }

  return { href: accountSignUpUrl(), label: messages.catalog.getStarted, external: true };
}

export function resolveProductFinalCta(
  product: PublicProductDetail,
  locale: SupportedLocale,
  messages: Messages,
  accountUrl?: string,
): ProductPrimaryCta | null {
  const { marketing } = product;
  if (marketing.cta?.buttonHref && marketing.cta.buttonLabel) {
    const href = resolveHref(locale, marketing.cta.buttonHref);
    return { href, label: marketing.cta.buttonLabel, external: href.startsWith("http") };
  }
  if (product.plans.length > 0) {
    return resolveProductPrimaryCta(product, locale, messages, accountUrl);
  }
  return null;
}
