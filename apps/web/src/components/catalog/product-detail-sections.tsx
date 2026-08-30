import type { ReactNode } from "react";
import type { PublicProductDetail } from "@khepree/catalog";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { Badge, Container } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { PricingPlanCard } from "./pricing-plan-card";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-khepree-slate/10 py-12">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ProductDetailSections({
  product,
  locale,
  messages,
  accountUrl,
}: {
  product: PublicProductDetail;
  locale: SupportedLocale;
  messages: Messages;
  accountUrl?: string;
}) {
  const { marketing } = product;
  const price = product.startingPrice;
  const interval = price ? formatBillingInterval(price.interval, locale) : null;
  const gallery = product.gallery.length > 0 ? product.gallery : product.icon ? [product.icon] : [];
  const pricingHref = `#pricing`;
  const checkoutHref = accountUrl ? `${accountUrl}` : localePath(locale, "/pricing");

  return (
    <Container className="pb-16">
      <section id="hero" className="grid gap-10 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <div className="flex items-center gap-4">
            {product.icon ? (
              // eslint-disable-next-line @next/next/no-img-element -- product icon from studio
              <img src={product.icon.url} alt={product.icon.altText || product.name} className="h-16 w-16 rounded-2xl object-cover" />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {product.platforms.map((platform) => (
                <Badge key={platform} variant="outline">
                  {messages.catalog.platforms[platform]}
                </Badge>
              ))}
            </div>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{product.name}</h1>
          {product.shortDescription ? (
            <p className="mt-4 text-lg text-khepree-slate/80">{product.shortDescription}</p>
          ) : null}
          {price ? (
            <p className="mt-4 text-lg font-semibold">
              {messages.catalog.startingFrom}{" "}
              {formatPriceAmount(price.amountMinor, price.currency, locale)}
              {interval}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={product.plans.length > 0 ? pricingHref : checkoutHref}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-button)] bg-khepree-teal px-5 text-sm font-medium text-khepree-white"
            >
              {messages.catalog.checkout}
            </Link>
            <Link
              href={localePath(locale, "/about")}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-button)] border border-khepree-mist px-5 text-sm font-medium"
            >
              {messages.hero.ctaSecondary}
            </Link>
          </div>
        </div>
        {gallery[0] ? (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-khepree-mist">
            {/* eslint-disable-next-line @next/next/no-img-element -- product studio screenshot */}
            <img src={gallery[0].url} alt={gallery[0].altText || product.name} className="w-full object-cover" />
          </div>
        ) : null}
      </section>

      {marketing.benefits?.length ? (
        <Section id="outcomes" title={messages.catalog.sections.benefits}>
          <div className="grid gap-4 md:grid-cols-2">
            {marketing.benefits.map((item) => (
              <article key={item.title} className="rounded-[var(--radius-card)] border border-khepree-mist p-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-khepree-slate/80">{item.description}</p>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {marketing.highlights?.length ? (
        <Section id="features" title={messages.catalog.sections.features}>
          <div className="grid gap-4 md:grid-cols-6">
            {marketing.highlights.map((item, index) => (
              <article
                key={item.title}
                className={
                  index === 0
                    ? "rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-cloud/70 p-6 md:col-span-4"
                    : "rounded-[var(--radius-card)] border border-khepree-mist p-5 md:col-span-2"
                }
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-khepree-slate/80">{item.description}</p>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {gallery.length > 1 ? (
        <Section id="gallery" title={messages.catalog.sections.gallery}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {gallery.slice(1).map((item) => (
              <li key={item.url}>
                {/* eslint-disable-next-line @next/next/no-img-element -- product studio screenshot */}
                <img src={item.url} alt={item.altText || product.name} className="w-full rounded-xl object-cover" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {marketing.howItWorks?.length ? (
        <Section id="how-it-works" title={messages.catalog.sections.howItWorks}>
          <ol className="space-y-4">
            {marketing.howItWorks.map((step) => (
              <li key={step.step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-khepree-slate/10 text-sm font-semibold">
                  {step.step}
                </span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1 text-khepree-slate/80">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {product.operatingSystems.length > 0 || product.platforms.length > 0 ? (
        <Section
          id="platforms"
          title={
            product.operatingSystems.length > 0
              ? messages.catalog.sections.requirements
              : messages.catalog.sections.platforms
          }
        >
          <ul className="flex flex-wrap gap-2">
            {(product.operatingSystems.length > 0 ? product.operatingSystems : product.platforms).map(
              (item) => (
                <li key={item}>
                  <Badge>
                    {product.operatingSystems.length > 0
                      ? item
                      : messages.catalog.platforms[item as keyof typeof messages.catalog.platforms]}
                  </Badge>
                </li>
              ),
            )}
          </ul>
        </Section>
      ) : null}

      {product.plans.length > 0 ? (
        <Section id="pricing" title={messages.catalog.sections.pricing}>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {product.plans.map((plan) => (
              <PricingPlanCard
                key={plan.publicId}
                plan={plan}
                locale={locale}
                messages={messages}
                accountUrl={accountUrl}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {marketing.faq?.length ? (
        <Section id="faq" title={messages.catalog.sections.faq}>
          <dl className="space-y-6">
            {marketing.faq.map((item) => (
              <div key={item.question}>
                <dt className="font-medium">{item.question}</dt>
                <dd className="mt-2 text-khepree-slate/80">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {marketing.relatedContent?.length ? (
        <Section id="related" title={messages.catalog.sections.related}>
          <ul className="space-y-2">
            {marketing.relatedContent.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href.startsWith("http") ? item.href : localePath(locale, item.href)}
                  className="text-khepree-accent hover:underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="cta" title={messages.catalog.sections.cta}>
        <div className="rounded-2xl border border-khepree-slate/10 bg-khepree-ink p-8 text-khepree-white">
          <h3 className="text-xl font-semibold">{marketing.cta?.headline ?? messages.cta.heading}</h3>
          {marketing.cta?.description ? (
            <p className="mt-2 text-white/80">{marketing.cta.description}</p>
          ) : product.content ? (
            <p className="mt-2 text-white/80">{product.content}</p>
          ) : null}
          <Link
            href={
              marketing.cta?.buttonHref
                ? marketing.cta.buttonHref.startsWith("http")
                  ? marketing.cta.buttonHref
                  : localePath(locale, marketing.cta.buttonHref)
                : localePath(locale, "/products")
            }
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--radius-button)] bg-khepree-teal px-5 text-sm font-medium text-khepree-white"
          >
            {marketing.cta?.buttonLabel ?? messages.cta.button}
          </Link>
        </div>
      </Section>
    </Container>
  );
}
