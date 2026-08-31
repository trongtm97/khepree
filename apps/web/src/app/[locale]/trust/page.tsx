import Link from "next/link";
import {
  BodyText,
  Container,
  GradientMesh,
  HeroEnergyField,
  HeroTitle,
  Title,
  cn,
} from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { createPageBreadcrumbs, pageBreadcrumbJsonLd } from "@/lib/seo/page-breadcrumbs";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.trust;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/trust",
  });
}

export default async function TrustPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.trust;

  const breadcrumbs = createPageBreadcrumbs(locale, messages, {
    label: content.breadcrumb,
    href: localePath(locale, "/trust"),
  });

  return (
    <>
      <JsonLd data={pageBreadcrumbJsonLd(breadcrumbs)} />
      <section className="tech-section relative overflow-hidden border-b border-white/10">
        <GradientMesh tone="mixed" className="opacity-50" />
        <HeroEnergyField intensity="soft" />
        <Container className="relative px-5 py-14 sm:px-6 sm:py-16 lg:py-24">
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
                {"link" in section && section.link ? (
                  <p className="mt-4">
                    <Link
                      href={localePath(locale, section.link.path)}
                      className="font-medium text-teal hover:underline"
                    >
                      {section.link.label}
                    </Link>
                  </p>
                ) : null}
                {"links" in section && section.links ? (
                  <ul className={cn("mt-4 flex flex-wrap gap-x-4 gap-y-2 text-base sm:text-lg")}>
                    {section.links.map((item) => (
                      <li key={item.path}>
                        <Link
                          href={localePath(locale, item.path)}
                          className="font-medium text-teal hover:underline"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </>
  );
}
