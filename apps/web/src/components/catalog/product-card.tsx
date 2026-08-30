import type { PublicProductSummary } from "@khepree/catalog";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { ProductCard as ProductCardShell } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export function ProductCard({
  product,
  locale,
  messages,
}: {
  product: PublicProductSummary;
  locale: SupportedLocale;
  messages?: Messages;
}) {
  const price = product.startingPrice;
  const interval = price ? formatBillingInterval(price.interval, locale) : null;
  const icon = product.gallery?.[0] ?? product.icon;

  return (
    <Link href={localePath(locale, `/products/${product.slug}`)} className="group block h-full">
      <ProductCardShell
        className="group"
        title={product.name}
        description={product.shortDescription ?? product.description ?? ""}
        image={
          icon
            ? {
                src: icon.url ?? "",
                alt: icon.altText || product.name,
              }
            : undefined
        }
        fallbackInitial={product.name.slice(0, 1)}
        badge={
          product.platforms.length > 0
            ? product.platforms
                .map((platform) => messages?.catalog.platforms[platform] ?? platform)
                .join(" · ")
            : undefined
        }
        priceLabel={
          price && messages
            ? `${messages.catalog.startingFrom} ${formatPriceAmount(price.amountMinor, price.currency, locale)}${interval ?? ""}`
            : undefined
        }
        ctaLabel={messages?.catalog.viewProduct}
      />
    </Link>
  );
}
