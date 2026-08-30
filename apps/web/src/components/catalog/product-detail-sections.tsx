import type { ReactNode } from "react";
import type { PublicProductDetail, PublicProductMedia } from "@khepree/catalog";
import {
  Badge,
  BodyText,
  Container,
  GlassPanel,
  HeroEnergyField,
  HeroTitle,
  Title,
} from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { formatPublicStartingPrice } from "@/lib/catalog-display";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/marketing/button-link";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { PricingPlanCard } from "./pricing-plan-card";
import { ProductHeroVisual, ProductScreenshot } from "./product-visual";

function Section({
  id,
  title,
  children,
  dark,
}: {
  id: string;
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 border-t border-border py-14 lg:py-20 ${dark ? "tech-section relative overflow-hidden" : ""}`}
    >
      {dark ? <HeroEnergyField intensity="soft" /> : null}
      <div className={dark ? "relative" : undefined}>
        <Title className={dark ? "text-foreground" : undefined}>{title}</Title>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

const FEATURE_VISUALS = [
  "bg-gradient-to-br from-teal/15 via-cyan/10 to-transparent",
  "bg-[radial-gradient(circle_at_top_right,rgb(99_102_241/0.12),transparent_60%)]",
  "bg-gradient-to-tr from-solar-accent/12 via-teal/8 to-transparent",
  "bg-[linear-gradient(135deg,rgb(6_182_212/0.1),rgb(20_184_166/0.06))]",
];

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
  const starting = price
    ? formatPublicStartingPrice(price.amountMinor, price.currency, price.interval, locale)
    : null;
  const heroMedia: PublicProductMedia | null = product.gallery[0] ?? product.icon;
  const storyScreens = product.gallery.slice(1);
  const pricingHref = "#pricing";
  const checkoutHref = accountUrl ?? localePath(locale, "/pricing");

  return (
    <Container className="pb-20">
      <section id="hero" className="relative overflow-hidden py-12 lg:py-20">
        <HeroEnergyField intensity="soft" className="opacity-60" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <div className="flex items-start gap-4">
              {product.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- Product Studio icon
                <img
                  src={product.icon.url}
                  alt={product.icon.altText || product.name}
                  className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover shadow-[var(--shadow-soft)]"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {product.platforms.map((platform) => (
                  <Badge key={platform} variant="teal">
                    {messages.catalog.platforms[platform]}
                  </Badge>
                ))}
              </div>
            </div>
            <HeroTitle className="mt-6">{product.name}</HeroTitle>
            {(product.shortDescription || product.description) && (
              <BodyText className="mt-4 text-lg text-muted">
                {product.shortDescription ?? product.description}
              </BodyText>
            )}
            {starting ? (
              <p className="mt-6">
                <span className="text-sm text-muted">{messages.catalog.startingFrom} </span>
                <span className="text-2xl font-semibold tracking-tight text-foreground">{starting.amount}</span>
                {starting.period ? (
                  <span className="ml-2 text-sm font-medium text-teal">{starting.period}</span>
                ) : null}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={product.plans.length > 0 ? pricingHref : checkoutHref} size="lg">
                {messages.catalog.checkout}
              </ButtonLink>
              <ButtonLink href={localePath(locale, "/products")} variant="secondary" size="lg">
                {messages.footer.allProducts}
              </ButtonLink>
            </div>
          </div>
          <ProductHeroVisual media={heroMedia} productName={product.name} priority />
        </div>
      </section>

      {marketing.benefits?.length ? (
        <Section id="outcomes" title={messages.catalog.sections.benefits}>
          <div className="grid gap-4 md:grid-cols-2">
            {marketing.benefits.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 80}>
                <GlassPanel className={`h-full p-6 ${index % 2 === 0 ? "md:translate-y-0" : "md:translate-y-4"}`}>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <BodyText className="mt-2">{item.description}</BodyText>
                </GlassPanel>
              </ScrollReveal>
            ))}
          </div>
        </Section>
      ) : null}

      {marketing.highlights?.length ? (
        <Section id="features" title={messages.catalog.sections.features}>
          <div className="grid auto-rows-fr gap-4 md:grid-cols-6">
            {marketing.highlights.map((item, index) => {
              const wide = index === 0 || index === 3;
              return (
                <ScrollReveal key={item.title} delay={index * 90}>
                  <GlassPanel
                    className={`relative overflow-hidden p-6 ${wide ? "md:col-span-4" : "md:col-span-2"} ${FEATURE_VISUALS[index % FEATURE_VISUALS.length]}`}
                  >
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <BodyText className="mt-2">{item.description}</BodyText>
                  </GlassPanel>
                </ScrollReveal>
              );
            })}
          </div>
        </Section>
      ) : null}

      {storyScreens.length > 0 ? (
        <Section id="gallery" title={messages.catalog.sections.gallery}>
          <div className="space-y-16">
            {storyScreens.map((shot, index) => (
              <ScrollReveal key={shot.url} delay={index * 100}>
                <div
                  className={`grid items-center gap-8 lg:grid-cols-2 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
                >
                  <ProductScreenshot media={shot} productName={product.name} />
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-teal">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <BodyText className="mt-3 text-lg">
                      {shot.altText || product.name}
                    </BodyText>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </Section>
      ) : null}

      {marketing.howItWorks?.length ? (
        <Section id="how-it-works" title={messages.catalog.sections.howItWorks}>
          <ol className="grid gap-6 md:grid-cols-3">
            {marketing.howItWorks.map((step) => (
              <li key={step.step} className="relative rounded-[var(--radius-card)] border border-border p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/15 text-sm font-semibold text-teal">
                  {step.step}
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                <BodyText className="mt-2">{step.description}</BodyText>
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
                  <Badge variant="outline">
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
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {product.plans.map((plan, index) => (
              <ScrollReveal key={plan.publicId} className={index === 1 ? "lg:-translate-y-2" : undefined}>
                <PricingPlanCard
                  plan={plan}
                  locale={locale}
                  messages={messages}
                  accountUrl={accountUrl}
                  featured={index === 1 && product.plans.length > 1}
                />
              </ScrollReveal>
            ))}
          </div>
        </Section>
      ) : null}

      {marketing.faq?.length ? (
        <Section id="faq" title={messages.catalog.sections.faq}>
          <dl className="divide-y divide-border rounded-[var(--radius-card)] border border-border">
            {marketing.faq.map((item) => (
              <div key={item.question} className="p-5">
                <dt className="font-medium text-foreground">{item.question}</dt>
                <dd className="mt-2 text-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {marketing.relatedContent?.length ? (
        <Section id="related" title={messages.catalog.sections.related}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {marketing.relatedContent.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href.startsWith("http") ? item.href : localePath(locale, item.href)}
                  className="block rounded-[var(--radius-card)] border border-border px-4 py-3 transition-colors hover:border-teal/40 hover:bg-surface"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="cta" title={messages.catalog.sections.cta} dark>
        <div className="max-w-2xl">
          <h3 className="text-2xl font-semibold text-foreground">
            {marketing.cta?.headline ?? messages.cta.heading}
          </h3>
          {(marketing.cta?.description || product.content) && (
            <BodyText className="mt-3 text-lg text-muted">
              {marketing.cta?.description ?? product.content}
            </BodyText>
          )}
          <ButtonLink
            href={
              marketing.cta?.buttonHref
                ? marketing.cta.buttonHref.startsWith("http")
                  ? marketing.cta.buttonHref
                  : localePath(locale, marketing.cta.buttonHref)
                : product.plans.length > 0
                  ? pricingHref
                  : checkoutHref
            }
            size="lg"
            className="mt-8 bg-teal text-background hover:bg-teal/90"
          >
            {marketing.cta?.buttonLabel ?? messages.catalog.checkout}
          </ButtonLink>
        </div>
      </Section>
    </Container>
  );
}
