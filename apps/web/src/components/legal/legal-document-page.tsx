import Link from "next/link";
import type { LegalPageMeta } from "@khepree/config";
import { BodyText, Container, GradientMesh, HeroEnergyField, HeroTitle, Title } from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageBreadcrumbs, pageBreadcrumbJsonLd } from "@/lib/seo/page-breadcrumbs";

export interface LegalSectionContent {
  heading: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  link?: { label: string; path: string };
}

export interface LegalPageContent {
  title: string;
  breadcrumb: string;
  description: string;
  headline: string;
  lead: string;
  sections: LegalSectionContent[];
  metaLabels: {
    version: string;
    effectiveDate: string;
    publishedAt: string;
  };
}

function renderTextWithEmail(text: string, email?: string) {
  if (!email || !text.includes("{email}")) return text;
  const parts = text.split("{email}");
  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 ? (
        <a href={`mailto:${email}`} className="font-medium text-teal hover:underline">
          {email}
        </a>
      ) : null}
    </span>
  ));
}

function formatLegalDate(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "long",
  }).format(new Date(iso));
}

export function LegalDocumentPage({
  locale,
  content,
  meta,
  contactEmail,
}: {
  locale: SupportedLocale;
  content: LegalPageContent;
  meta: LegalPageMeta;
  contactEmail?: string;
}) {
  const messages = getMessages(locale);
  const breadcrumbs = createPageBreadcrumbs(locale, messages, {
    label: content.breadcrumb,
    href: localePath(locale, meta.path),
  });

  return (
    <>
      <JsonLd data={pageBreadcrumbJsonLd(breadcrumbs)} />
      <section className="tech-section relative overflow-hidden border-b border-white/10">
        <GradientMesh tone="mixed" className="opacity-50" />
        <HeroEnergyField intensity="soft" />
        <Container className="relative z-10 px-5 py-14 sm:px-6 sm:py-16 lg:py-24">
          <Breadcrumbs items={breadcrumbs} />
          <HeroTitle className="mt-6 max-w-3xl text-foreground">{content.headline}</HeroTitle>
          <BodyText className="mt-4 max-w-2xl text-lg text-muted">{content.lead}</BodyText>
          <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <div>
              <dt className="inline font-medium text-foreground">{content.metaLabels.version}: </dt>
              <dd className="inline">{meta.version}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">{content.metaLabels.effectiveDate}: </dt>
              <dd className="inline">{formatLegalDate(meta.effectiveDate, locale)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">{content.metaLabels.publishedAt}: </dt>
              <dd className="inline">{formatLegalDate(meta.publishedAt, locale)}</dd>
            </div>
          </dl>
        </Container>
      </section>

      <Container className="px-5 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {content.sections.map((section, index) => (
            <ScrollReveal key={section.heading} delay={index * 40}>
              <section>
                <Title as="h2" className="text-xl">
                  {section.heading}
                </Title>
                {section.intro ? (
                  <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                    {renderTextWithEmail(section.intro, contactEmail)}
                  </p>
                ) : null}
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-base leading-relaxed text-muted sm:text-lg"
                  >
                    {renderTextWithEmail(paragraph, contactEmail)}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted sm:text-lg">
                    {section.bullets.map((item) => (
                      <li key={item}>{renderTextWithEmail(item, contactEmail)}</li>
                    ))}
                  </ul>
                ) : null}
                {section.link ? (
                  <p className="mt-4">
                    <Link
                      href={localePath(locale, section.link.path)}
                      className="font-medium text-teal hover:underline"
                    >
                      {section.link.label}
                    </Link>
                  </p>
                ) : null}
              </section>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </>
  );
}
