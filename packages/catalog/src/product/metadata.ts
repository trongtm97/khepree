import type { ProductMarketingMetadata, PublicProductMedia } from "./types";

export const KNOWN_OPERATING_SYSTEMS = [
  "Windows",
  "macOS",
  "Linux",
  "iOS",
  "Android",
  "Web",
] as const;
export type KnownOperatingSystem = (typeof KNOWN_OPERATING_SYSTEMS)[number];

export function parseOperatingSystems(metadata: Record<string, unknown>): string[] {
  const raw = metadata.operatingSystems;
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(KNOWN_OPERATING_SYSTEMS);
  return [...new Set(raw.filter((item): item is string => typeof item === "string" && allowed.has(item)))];
}

export function parseGalleryMediaPublicIds(metadata: Record<string, unknown>): string[] {
  const raw = metadata.galleryMediaPublicIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function toPublicMedia(
  url: string | null | undefined,
  altText: string | null | undefined,
): PublicProductMedia | null {
  if (!url) return null;
  return { url, altText: altText?.trim() || "" };
}

export function parseProductMarketingMetadata(
  metadata: Record<string, unknown>,
): ProductMarketingMetadata {
  const raw = metadata.marketing;
  if (!raw || typeof raw !== "object") return {};

  const marketing = raw as Record<string, unknown>;

  return {
    benefits: parseItems(marketing.benefits, parseBenefit),
    highlights: parseItems(marketing.highlights, parseBenefit),
    howItWorks: parseItems(marketing.howItWorks, parseHowItWorks),
    faq: parseItems(marketing.faq, parseFaq),
    relatedContent: parseItems(marketing.relatedContent, parseRelated),
    cta: parseCta(marketing.cta),
  };
}

function parseItems<T>(
  value: unknown,
  parser: (item: Record<string, unknown>) => T | null,
): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (item && typeof item === "object" ? parser(item as Record<string, unknown>) : null))
    .filter((item): item is T => item !== null);
  return items.length > 0 ? items : undefined;
}

function parseBenefit(item: Record<string, unknown>) {
  if (typeof item.title !== "string" || typeof item.description !== "string") return null;
  return { title: item.title, description: item.description };
}

function parseHowItWorks(item: Record<string, unknown>) {
  if (
    typeof item.step !== "number" ||
    typeof item.title !== "string" ||
    typeof item.description !== "string"
  ) {
    return null;
  }
  return { step: item.step, title: item.title, description: item.description };
}

function parseFaq(item: Record<string, unknown>) {
  if (typeof item.question !== "string" || typeof item.answer !== "string") return null;
  return { question: item.question, answer: item.answer };
}

function parseRelated(item: Record<string, unknown>) {
  if (typeof item.title !== "string" || typeof item.href !== "string") return null;
  return { title: item.title, href: item.href };
}

function parseCta(value: unknown): ProductMarketingMetadata["cta"] {
  if (!value || typeof value !== "object") return undefined;
  const cta = value as Record<string, unknown>;
  if (
    typeof cta.headline !== "string" ||
    typeof cta.buttonLabel !== "string" ||
    typeof cta.buttonHref !== "string"
  ) {
    return undefined;
  }
  return {
    headline: cta.headline,
    description: typeof cta.description === "string" ? cta.description : undefined,
    buttonLabel: cta.buttonLabel,
    buttonHref: cta.buttonHref,
  };
}
