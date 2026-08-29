import type { ReactNode } from "react";
import type { PublicProductDetail } from "@khepree/catalog";
import { Badge, Card, CardDescription, CardTitle, Container } from "@khepree/ui";
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

  return (
    <Container className="pb-16">
      <section id="hero" className="py-12 lg:py-16">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {product.platforms.map((platform) => (
              <Badge key={platform} variant="outline">
                {messages.catalog.platforms[platform]}
              </Badge>
            ))}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{product.name}</h1>
          {product.shortDescription ? (
            <p className="mt-4 text-lg text-khepree-slate/80">{product.shortDescription}</p>
          ) : null}
          {product.content ? (
            <p className="mt-4 text-khepree-slate/80">{product.content}</p>
          ) : null}
        </div>
      </section>

      {marketing.benefits?.length ? (
        <Section id="benefits" title={messages.catalog.sections.benefits}>
          <div className="grid gap-4 md:grid-cols-2">
            {marketing.benefits.map((item) => (
              <Card key={item.title}>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-2">{item.description}</CardDescription>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {marketing.highlights?.length ? (
        <Section id="features" title={messages.catalog.sections.features}>
          <ul className="grid gap-4 md:grid-cols-2">
            {marketing.highlights.map((item) => (
              <li key={item.title}>
                <Card>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="mt-2">{item.description}</CardDescription>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.platforms.length > 0 ? (
        <Section id="platforms" title={messages.catalog.sections.platforms}>
          <ul className="flex flex-wrap gap-2">
            {product.platforms.map((platform) => (
              <li key={platform}>
                <Badge>{messages.catalog.platforms[platform]}</Badge>
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

      {marketing.cta ? (
        <Section id="cta" title={messages.catalog.sections.cta}>
          <div className="rounded-2xl border border-khepree-slate/10 bg-khepree-slate/5 p-8">
            <h3 className="text-xl font-semibold">{marketing.cta.headline}</h3>
            {marketing.cta.description ? (
              <p className="mt-2 text-khepree-slate/80">{marketing.cta.description}</p>
            ) : null}
            <Link
              href={
                marketing.cta.buttonHref.startsWith("http")
                  ? marketing.cta.buttonHref
                  : localePath(locale, marketing.cta.buttonHref)
              }
              className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--radius-button)] bg-khepree-teal px-5 text-sm font-medium text-khepree-white shadow-sm shadow-khepree-teal/20 transition-colors hover:bg-khepree-teal/90"
            >
              {marketing.cta.buttonLabel}
            </Link>
          </div>
        </Section>
      ) : null}
    </Container>
  );
}
