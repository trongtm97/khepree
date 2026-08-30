import { BodyText, Container, GradientMesh, HeroEnergyField, HeroTitle } from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
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

  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: content.title },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          breadcrumbs.filter((b) => b.href).map((b) => ({ name: b.label, href: b.href! })),
        )}
      />
      <section className="tech-section relative overflow-hidden border-b border-white/10">
        <GradientMesh tone="mixed" className="opacity-50" />
        <HeroEnergyField intensity="soft" />
        <Container className="relative py-16 lg:py-24">
          <Breadcrumbs items={breadcrumbs} />
          <HeroTitle className="mt-6 max-w-3xl text-foreground">{content.title}</HeroTitle>
          <BodyText className="mt-4 max-w-2xl text-lg text-muted">{content.intro}</BodyText>
        </Container>
      </section>
      <Container className="py-14 lg:py-20">
        <div className="mx-auto max-w-3xl space-y-8 text-lg leading-relaxed text-muted">
          {[content.story1, content.story2, content.story3].map((paragraph, index) => (
            <ScrollReveal key={index}>
              <p>{paragraph}</p>
            </ScrollReveal>
          ))}
          <ScrollReveal>
            <p className="pt-4 text-xl font-medium text-foreground">{content.tagline}</p>
          </ScrollReveal>
        </div>
      </Container>
    </>
  );
}
