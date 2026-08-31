import { BodyText, Container, GradientMesh, HeroEnergyField, HeroTitle, Title, cn, ctaButtonGroupClass } from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/marketing/button-link";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { createPageBreadcrumbs, pageBreadcrumbJsonLd } from "@/lib/seo/page-breadcrumbs";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.about;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/about",
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.about;

  const breadcrumbs = createPageBreadcrumbs(locale, messages, {
    label: content.breadcrumb,
    href: localePath(locale, "/about"),
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
        </Container>
      </section>

      <Container className="px-5 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl space-y-14">
          {content.sections.map((section, index) => (
            <ScrollReveal key={section.heading} delay={index * 60}>
              <section>
                <Title as="h2" className="text-2xl">
                  {section.heading}
                </Title>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-muted sm:text-lg">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            </ScrollReveal>
          ))}

          <ScrollReveal>
            <section>
              <Title as="h2" className="text-2xl">
                {content.criteriaHeading}
              </Title>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted sm:text-lg">
                {content.criteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">{content.closing}</p>
              <div className={cn(ctaButtonGroupClass, "mt-8")}>
                <ButtonLink href={localePath(locale, "/products")} variant="accent" showArrow fullWidthMobile>
                  {content.ctaProducts}
                </ButtonLink>
                <ButtonLink href={localePath(locale, "/changelog")} variant="secondary" fullWidthMobile>
                  {content.ctaChangelog}
                </ButtonLink>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </Container>
    </>
  );
}
