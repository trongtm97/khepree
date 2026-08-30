import type { PublicProductSummary } from "@khepree/catalog";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { BodyText, Container, ProductWindow, Title, cn, ctaButtonGroupClass } from "@khepree/ui";
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
      ? `${formatPriceAmount(price.amountMinor, price.currency, locale)}${interval ?? ""}`
      : messages.catalog.priceUnavailable;
  const platformLabel =
    product.platforms.length > 0
      ? product.platforms.map((p) => messages.catalog.platforms[p] ?? p).join(" · ")
      : null;
  const helpText = product.shortDescription ?? product.description ?? "";

  return (
    <ScrollReveal delay={reverse ? 120 : 0}>
      <article className="grid items-center gap-6 border-b border-border pb-12 last:border-b-0 last:pb-0 lg:grid-cols-2 lg:gap-12 lg:pb-0 lg:last:border-b-0">
        <div className={reverse ? "lg:order-2" : undefined}>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {messages.products.whatItIs}
              </dt>
              <dd className="mt-1">
                <Title as="h3" className="text-2xl sm:text-3xl">
                  {product.name}
                </Title>
              </dd>
            </div>
            {helpText ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {messages.products.helpsWith}
                </dt>
                <dd className="mt-1">
                  <BodyText className="text-base leading-relaxed sm:text-lg">{helpText}</BodyText>
                </dd>
              </div>
            ) : null}
            {platformLabel ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {messages.products.worksOn}
                </dt>
                <dd className="mt-1 text-base font-medium text-foreground">{platformLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {messages.catalog.startingFrom}
              </dt>
              <dd className="mt-1 font-mono text-base text-teal">{priceLabel}</dd>
            </div>
          </dl>
          <div className={cn(ctaButtonGroupClass, "mt-6")}>
            <ButtonLink
              href={localePath(locale, `/products/${product.slug}`)}
              variant="accent"
              showArrow
              fullWidthMobile
            >
              {messages.catalog.viewProduct}
            </ButtonLink>
          </div>
        </div>

        <div className={`relative hidden lg:block ${reverse ? "lg:order-1" : ""}`}>
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
  if (products.length === 0) return null;

  return (
    <section id="products" className="section-surface border-t border-border section-py">
      <Container>
        <div className="max-w-2xl">
          <Title className="text-pretty">{messages.products.heading}</Title>
          <BodyText className="mt-4 text-base sm:text-lg">{messages.products.intro}</BodyText>
        </div>

        <div className="mt-12 space-y-12 sm:space-y-16 lg:space-y-20">
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

        <p className="mt-12 text-center">
          <Link href={localePath(locale, "/products")} className="text-sm font-medium text-teal hover:underline">
            {messages.footer.allProducts}
          </Link>
        </p>
      </Container>
    </section>
  );
}
