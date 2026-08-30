import type { PublicProductSummary } from "@khepree/catalog";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export interface NavProductItem {
  slug: string;
  name: string;
  shortDescription: string | null;
  platformLabel: string | null;
  href: string;
  iconUrl: string | null;
  iconAlt: string;
}

export function toNavProducts(
  products: PublicProductSummary[],
  locale: SupportedLocale,
  messages: Messages,
): NavProductItem[] {
  return products.map((product) => {
    const icon = product.icon ?? product.gallery[0] ?? null;
    const platformLabel =
      product.platforms.length > 0
        ? product.platforms.map((platform) => messages.catalog.platforms[platform] ?? platform).join(" · ")
        : null;

    return {
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      platformLabel,
      href: localePath(locale, `/products/${product.slug}`),
      iconUrl: icon?.url ?? null,
      iconAlt: icon?.altText || product.name,
    };
  });
}
