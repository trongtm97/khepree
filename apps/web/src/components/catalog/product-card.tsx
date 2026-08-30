import type { PublicProductSummary } from "@khepree/catalog";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { Badge, Card, CardDescription, CardTitle } from "@khepree/ui";
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

  return (
    <Link href={localePath(locale, `/products/${product.slug}`)} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden p-0 transition-shadow group-hover:shadow-md">
        {product.icon || product.gallery?.[0] ? (
          <div className="flex h-36 items-center justify-center bg-khepree-cloud">
            {/* eslint-disable-next-line @next/next/no-img-element -- product studio media */}
            <img
              src={(product.gallery?.[0] ?? product.icon)?.url ?? ""}
              alt={(product.gallery?.[0] ?? product.icon)?.altText || product.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="flex h-36 items-center justify-center bg-gradient-to-br from-khepree-ink to-khepree-teal/40 text-2xl font-semibold text-white"
          >
            {product.name.slice(0, 1)}
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{product.name}</CardTitle>
            {product.platforms.length > 0 ? (
              <Badge variant="outline">
                {product.platforms
                  .map((platform) => messages?.catalog.platforms[platform] ?? platform)
                  .join(" · ")}
              </Badge>
            ) : null}
          </div>
          <CardDescription className="mt-2 flex-1">
            {product.shortDescription ?? product.description ?? ""}
          </CardDescription>
          {price && messages ? (
            <p className="mt-4 text-sm font-medium text-khepree-ink">
              {messages.catalog.startingFrom}{" "}
              {formatPriceAmount(price.amountMinor, price.currency, locale)}
              {interval}
            </p>
          ) : null}
          {messages ? (
            <p className="mt-3 text-sm font-medium text-khepree-teal">{messages.catalog.viewProduct}</p>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
