import { BRAND } from "@khepree/config";
import type { PublicProductDetail } from "@khepree/catalog";
import { isPurchasableBillingType, minorToMajor, selectDisplayPrice } from "@khepree/catalog";
import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION, getPublicContactAddresses } from "@khepree/config";
import { siteUrl } from "./metadata";

function schemaPrice(amountMinor: string, currency: string): string {
  return String(minorToMajor(BigInt(amountMinor), currency));
}

function getSocialUrls(): string[] {
  return [
    process.env.NEXT_PUBLIC_SOCIAL_TWITTER,
    process.env.NEXT_PUBLIC_SOCIAL_GITHUB,
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
  ].filter((url): url is string => Boolean(url && url.startsWith("http")));
}

/** Factual organization fields only — no invented founding date, awards, or employee counts. */
export function organizationJsonLd() {
  const contacts = getPublicContactAddresses();
  const contactPoint = [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: contacts.support,
    },
    ...(contacts.billing
      ? [{ "@type": "ContactPoint", contactType: "billing", email: contacts.billing }]
      : []),
  ];

  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: siteUrl(),
    logo: siteUrl("/brand/logo.png"),
    contactPoint,
  };

  const sameAs = getSocialUrls();
  if (sameAs.length > 0) payload.sameAs = sameAs;

  return payload;
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: siteUrl(),
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : siteUrl(item.href),
    })),
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string[];
  image?: string;
  offers?: Array<{
    name: string;
    price: string;
    priceCurrency: string;
    url?: string;
    billingDuration?: string;
  }>;
}) {
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: input.applicationCategory ?? "BusinessApplication",
  };

  if (input.operatingSystem?.length) {
    payload.operatingSystem = input.operatingSystem.join(", ");
  }
  if (input.image) payload.image = input.image;
  if (input.offers?.length) {
    payload.offers = input.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      ...(offer.url ? { url: offer.url } : {}),
      ...(offer.billingDuration ? { priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: offer.billingDuration } } : {}),
    }));
  }

  return payload;
}

/** Build offer rows from product plans — VND-first when configured. */
export function productPlanOffersJsonLd(
  product: PublicProductDetail,
  pageUrl: string,
): NonNullable<Parameters<typeof softwareApplicationJsonLd>[0]["offers"]> {
  const offers: NonNullable<Parameters<typeof softwareApplicationJsonLd>[0]["offers"]> = [];

  for (const plan of product.plans) {
    if (plan.pricingMode === "free") {
      offers.push({ name: plan.name, price: "0", priceCurrency: DEFAULT_CURRENCY, url: pageUrl });
      continue;
    }
    if (plan.pricingMode === "contact_sales") continue;

    const price = selectDisplayPrice(plan.prices, {
      currency: DEFAULT_CURRENCY,
      region: DEFAULT_MARKET_REGION,
      defaultCurrency: DEFAULT_CURRENCY,
    });
    if (!price || !isPurchasableBillingType(plan.billingType)) continue;

    const major = schemaPrice(price.amountMinor, price.currency);
    offers.push({
      name: plan.name,
      price: major,
      priceCurrency: price.currency,
      url: `${pageUrl}#pricing`,
      billingDuration: price.interval ? `P1${price.interval === "year" ? "Y" : "M"}` : undefined,
    });
  }

  return offers;
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  inLanguage: string;
  author?: string;
  image?: string;
}) {
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage,
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: siteUrl(),
    },
  };
  if (input.author) {
    payload.author = { "@type": "Person", name: input.author };
  }
  if (input.image) payload.image = input.image;
  if (input.datePublished) {
    payload.datePublished =
      input.datePublished instanceof Date
        ? input.datePublished.toISOString()
        : input.datePublished;
  }
  if (input.dateModified) {
    payload.dateModified =
      input.dateModified instanceof Date
        ? input.dateModified.toISOString()
        : input.dateModified;
  }
  return payload;
}
