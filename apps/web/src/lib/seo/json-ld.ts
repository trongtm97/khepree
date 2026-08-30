import { BRAND } from "@khepree/config";
import { siteUrl } from "./metadata";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: siteUrl(),
    description: BRAND.tagline,
    sameAs: getSocialUrls(),
  };
}

function getSocialUrls(): string[] {
  const urls = [
    process.env.NEXT_PUBLIC_SOCIAL_TWITTER,
    process.env.NEXT_PUBLIC_SOCIAL_GITHUB,
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
  ].filter((url): url is string => Boolean(url && url.startsWith("http")));

  return urls;
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

  return payload;
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
