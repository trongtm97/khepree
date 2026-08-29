import type { PublicProductSummary } from "@khepree/catalog";
import { Badge, Card, CardDescription, CardTitle } from "@khepree/ui";
import Link from "next/link";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export function ProductCard({
  product,
  locale,
}: {
  product: PublicProductSummary;
  locale: SupportedLocale;
}) {
  return (
    <Link href={localePath(locale, `/products/${product.slug}`)} className="group block h-full">
      <Card className="flex h-full flex-col transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{product.name}</CardTitle>
          {product.platforms.length > 0 ? (
            <Badge variant="outline">{product.platforms.join(" · ")}</Badge>
          ) : null}
        </div>
        <CardDescription className="mt-2 flex-1">
          {product.shortDescription ?? product.description ?? ""}
        </CardDescription>
      </Card>
    </Link>
  );
}
