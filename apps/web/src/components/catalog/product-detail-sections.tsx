import type { ReactNode } from "react";
import type { PublicProductDetail, PublicProductMedia } from "@khepree/catalog";
import { renderContentBody } from "@khepree/catalog/content/body-html";
import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION } from "@khepree/config";
import {
  Badge,
  BodyText,
  Container,
  GlassPanel,
  HeroEnergyField,
  HeroTitle,
  Title,
  cn,
  ctaButtonGroupClass,
} from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { formatPublicStartingPrice } from "@/lib/catalog-display";
import { resolveProductFinalCta, resolveProductPrimaryCta } from "@/lib/product-cta";
import { listProductPageSections, listSolutionCards } from "@/lib/product-page-sections";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/marketing/button-link";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { PricingPlanCard } from "./pricing-plan-card";
import { ProductLocalNav } from "./product-local-nav";
import { ProductMobileCta } from "./product-mobile-cta";
import { ProductDescription } from "./product-description";
import { ProductHeroVisual } from "./product-visual";

function Section({
  id,
  title,
  intro,
  children,
  dark,
  inset,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
  dark?: boolean;
  /** Padded inner frame on dark sections — CTA blocks. */
  inset?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-32 border-t border-border py-14 lg:scroll-mt-36 lg:py-20 ${dark ? "tech-section relative overflow-hidden" : ""}`}
    >
      {dark ? <HeroEnergyField intensity="soft" /> : null}
      <div
        className={cn(
          dark && "relative",
          dark &&
            inset &&
            "rounded-[var(--radius-card)] border border-white/12 bg-white/[0.05] p-6 sm:p-8 lg:p-10",
        )}
      >
        <Title className={dark ? "text-foreground" : undefined}>{title}</Title>
        {intro ? <BodyText className="mt-3 max-w-3xl text-muted">{intro}</BodyText> : null}
        <div className={inset ? "mt-6" : "mt-8"}>{children}</div>
      </div>
    </section>
  );
}

const PRODUCT_RELATED_LINKS = [
  { key: "docs", path: "/docs" },
  { key: "changelog", path: "/changelog" },
  { key: "security", path: "/security" },
  { key: "privacy", path: "/privacy" },
] as const;

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
  const sections = listProductPageSections(product);
  const primaryCta = resolveProductPrimaryCta(product, locale, messages, accountUrl);
  const finalCta = resolveProductFinalCta(product, locale, messages, accountUrl);
  const solutionCards = listSolutionCards(marketing);
  const price = product.startingPrice;
  const starting = price
    ? formatPublicStartingPrice(price.amountMinor, price.currency, price.interval, locale)
    : null;
  const heroMedia: PublicProductMedia | null = product.cover ?? product.gallery[0] ?? product.icon;
  const heroOutcome = product.shortDescription ?? product.description;
  const fullDescriptionHtml = product.description ? renderContentBody(product.description) : null;
  const showLegacyMarketingSections = !fullDescriptionHtml;
  const hasPlans = product.plans.length > 0;
  const iconUrl = product.icon?.url ?? null;

  const primaryCtaLinkProps = primaryCta.external
    ? { href: primaryCta.href, target: "_blank" as const, rel: "noopener noreferrer" as const }
    : { href: primaryCta.href };

  return (
    <>
      <ProductLocalNav
        productName={product.name}
        iconUrl={iconUrl}
        iconAlt={product.icon?.altText || product.name}
        sections={sections}
        primaryCta={primaryCta}
        messages={messages}
      />

      <Container className={`pb-20 ${hasPlans ? "max-lg:pb-28" : ""}`}>
        <section id="overview" className="relative scroll-mt-32 overflow-hidden py-12 lg:scroll-mt-36 lg:py-20">
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
              {heroOutcome ? <BodyText className="mt-4 text-lg text-muted">{heroOutcome}</BodyText> : null}
              {starting ? (
                <p className="mt-6">
                  <span className="text-sm text-muted">{messages.catalog.startingFrom} </span>
                  <span className="text-2xl font-semibold tracking-tight text-foreground">{starting.amount}</span>
                  {starting.period ? (
                    <span className="ml-2 text-sm font-medium text-teal">{starting.period}</span>
                  ) : null}
                </p>
              ) : null}
              <div className={cn(ctaButtonGroupClass, "mt-8")}>
                <ButtonLink {...primaryCtaLinkProps} variant="accent" fullWidthMobile>
                  {primaryCta.label}
                </ButtonLink>
              </div>
            </div>
            <ProductHeroVisual media={heroMedia} productName={product.name} priority />
          </div>
          {fullDescriptionHtml ? (
            <ProductDescription
              html={fullDescriptionHtml}
              expandLabel={messages.catalog.expandDescription}
              collapseLabel={messages.catalog.collapseDescription}
            />
          ) : null}
        </section>

        {showLegacyMarketingSections && solutionCards.length > 0 ? (
          <Section id="solutions" title={messages.catalog.sections.solutions} intro={messages.catalog.solutionsIntro}>
            <div className="grid gap-4 md:grid-cols-2">
              {solutionCards.map((item, index) => (
                <ScrollReveal key={`${item.problem}-${index}`} delay={index * 80}>
                  <GlassPanel className="h-full p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                      {messages.catalog.solutionProblem}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{item.problem}</h3>
                    <p className="mt-3 text-sm text-muted">{item.helps}</p>
                    {item.result ? (
                      <p className="mt-4 text-sm font-medium text-foreground">
                        <span className="text-teal">{messages.catalog.solutionResult}: </span>
                        {item.result}
                      </p>
                    ) : null}
                  </GlassPanel>
                </ScrollReveal>
              ))}
            </div>
          </Section>
        ) : null}

        {showLegacyMarketingSections && marketing.highlights?.length ? (
          <Section id="features" title={messages.catalog.sections.features} intro={messages.catalog.featuresIntro}>
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

        {product.gallery.length > 0 ? (
          <Section id="gallery" title={messages.catalog.sections.gallery}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.gallery.map((item, index) => (
                <ScrollReveal key={`${item.url}-${index}`} delay={index * 80}>
                  <figure className="overflow-hidden rounded-[var(--radius-card)] border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element -- product gallery from catalog */}
                    <img src={item.url} alt={item.altText || product.name} className="aspect-video w-full object-cover" />
                  </figure>
                </ScrollReveal>
              ))}
            </div>
          </Section>
        ) : null}

        {showLegacyMarketingSections && marketing.howItWorks?.length ? (
          <Section id="howItWorks" title={messages.catalog.sections.howItWorks}>
            <ol className="grid gap-4 md:grid-cols-3">
              {marketing.howItWorks.map((step, index) => (
                <ScrollReveal key={`${step.step}-${step.title}`} delay={index * 80}>
                  <GlassPanel className="h-full p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal">Step {step.step}</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-3 text-sm text-muted">{step.description}</p>
                  </GlassPanel>
                </ScrollReveal>
              ))}
            </ol>
          </Section>
        ) : null}

        {product.operatingSystems.length > 0 || product.platforms.length > 0 ? (
          <Section id="requirements" title={messages.catalog.sections.requirements}>
            <div className="flex flex-wrap gap-2">
              {product.platforms.map((platform) => (
                <Badge key={platform} variant="teal">
                  {messages.catalog.platforms[platform]}
                </Badge>
              ))}
              {product.operatingSystems.map((os) => (
                <Badge key={os} variant="default">
                  {os}
                </Badge>
              ))}
            </div>
          </Section>
        ) : null}

        {product.plans.length > 0 ? (
          <Section id="pricing" title={messages.catalog.sections.pricing} intro={messages.catalog.pricingIntro}>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {product.plans.map((plan, index) => (
                <ScrollReveal key={plan.publicId} className={index === 1 ? "lg:-translate-y-2" : undefined}>
                  <PricingPlanCard
                    plan={plan}
                    locale={locale}
                    messages={messages}
                    accountUrl={accountUrl}
                    featured={index === 1 && product.plans.length > 1}
                    preferredCurrency={DEFAULT_CURRENCY}
                    preferredRegion={DEFAULT_MARKET_REGION}
                  />
                </ScrollReveal>
              ))}
            </div>
          </Section>
        ) : null}

        {marketing.relatedContent?.length ? (
          <Section id="guides" title={messages.catalog.sections.guides}>
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

        {showLegacyMarketingSections && marketing.faq?.length ? (
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

        <Section id="related" title={messages.catalog.relatedLinks.heading}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-base">
            {PRODUCT_RELATED_LINKS.map((item) => (
              <li key={item.path}>
                <Link
                  href={localePath(locale, item.path)}
                  className="font-medium text-teal hover:underline"
                >
                  {messages.catalog.relatedLinks[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {finalCta ? (
          <Section id="cta" title={messages.catalog.sections.cta} dark inset>
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold text-foreground">
                {marketing.cta?.headline ?? heroOutcome ?? product.name}
              </h3>
              {marketing.cta?.description ? (
                <BodyText className="mt-3 text-lg text-muted">{marketing.cta.description}</BodyText>
              ) : null}
              <ButtonLink
                {...(finalCta.external
                  ? { href: finalCta.href, target: "_blank" as const, rel: "noopener noreferrer" as const }
                  : { href: finalCta.href })}
                variant="accent"
                showArrow
                fullWidthMobile
                className="mt-8"
              >
                {finalCta.label}
              </ButtonLink>
            </div>
          </Section>
        ) : null}

        {hasPlans ? <ProductMobileCta href={primaryCta.href} label={primaryCta.label} /> : null}
      </Container>
    </>
  );
}
