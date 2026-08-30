import type { PublicProductSummary } from "@khepree/catalog";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { Badge, BodyText, Container, EmptyState, ProductWindow, Title } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { ScrollReveal } from "./scroll-reveal";

function ProductShowcaseRow({
  product,
  locale,
  messages,
  reverse,
}: {
  product: PublicProductSummary;
  locale: SupportedLocale;
  messages: Messages;
  reverse: boolean;
}) {
  const media = product.gallery[0] ?? product.icon;
  const price = product.startingPrice;
  const interval = price ? formatBillingInterval(price.interval, locale) : null;
  const priceLabel =
    price && messages
      ? `${messages.catalog.startingFrom} ${formatPriceAmount(price.amountMinor, price.currency, locale)}${interval ?? ""}`
      : messages.catalog.priceUnavailable;
  const platformLabel =
    product.platforms.length > 0
      ? product.platforms.map((p) => messages.catalog.platforms[p] ?? p).join(" · ")
      : null;

  return (
    <ScrollReveal delay={reverse ? 120 : 0}>
      <article
        className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
      >
        <div className="relative">
          {media?.url ? (
            <div className="product-window-depth overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-elevated)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- real product media */}
              <img
                src={media.url}
                alt={media.altText || product.name}
                className="aspect-[16/10] w-full object-cover object-top"
              />
            </div>
          ) : (
            <ProductWindow title={product.name} depth lightSweep className="shadow-[var(--shadow-elevated)]">
              <div className="space-y-4">
                <div className="h-3 w-32 rounded-full bg-teal/60" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-lg bg-border-subtle" />
                  <div className="h-20 rounded-lg bg-gradient-to-br from-teal/20 to-cyan/10" />
                </div>
                <div className="h-24 rounded-lg bg-border-subtle/80" />
              </div>
            </ProductWindow>
          )}
        </div>

        <div>
          {platformLabel ? (
            <Badge variant="outline" className="mb-4">
              {platformLabel}
            </Badge>
          ) : null}
          <Title as="h3" className="text-2xl sm:text-3xl">
            {product.name}
          </Title>
          <BodyText className="mt-4 text-lg">
            {product.shortDescription ?? product.description ?? ""}
          </BodyText>
          <p className="mt-4 font-mono text-sm text-teal">{priceLabel}</p>
          <div className="mt-6">
            <ButtonLink href={localePath(locale, `/products/${product.slug}`)}>
              {messages.catalog.viewProduct}
            </ButtonLink>
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
}

export function ProductShowcaseSection({
  locale,
  messages,
  products,
}: {
  locale: SupportedLocale;
  messages: Messages;
  products: PublicProductSummary[];
}) {
  return (
    <section id="products" className="py-16 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <Title>{messages.products.heading}</Title>
          <BodyText className="mt-4 text-lg">{messages.products.copy}</BodyText>
        </div>

        {products.length > 0 ? (
          <div className="mt-14 space-y-20 lg:space-y-28">
            {products.map((product, index) => (
              <ProductShowcaseRow
                key={product.publicId}
                product={product}
                locale={locale}
                messages={messages}
                reverse={index % 2 === 1}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title={messages.products.emptyTitle}
              description={messages.products.emptyDescription}
            />
          </div>
        )}

        {products.length > 0 ? (
          <p className="mt-12 text-center">
            <Link href={localePath(locale, "/products")} className="text-sm font-medium text-teal hover:underline">
              {messages.footer.allProducts}
            </Link>
          </p>
        ) : null}
      </Container>
    </section>
  );
}
