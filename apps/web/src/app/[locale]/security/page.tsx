import {
  BodyText,
  Container,
  GlassPanel,
  GradientMesh,
  HeroEnergyField,
  HeroTitle,
  Title,
} from "@khepree/ui";
import { getSecurityReportEmail } from "@khepree/config";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { notFound } from "next/navigation";

function ReportIntro({ text, email }: { text: string; email: string }) {
  const paragraphs = text.replace("{email}", "__EMAIL__").split("\n\n");

  return (
    <div className="mt-4 space-y-4 text-base leading-relaxed text-muted sm:text-lg">
      {paragraphs.map((paragraph, index) => {
        const segments = paragraph.split("__EMAIL__");
        return (
          <p key={index}>
            {segments.map((segment, segmentIndex) => (
              <span key={segmentIndex}>
                {segment}
                {segmentIndex < segments.length - 1 ? (
                  <a href={`mailto:${email}`} className="font-medium text-teal hover:underline">
                    {email}
                  </a>
                ) : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.security;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/security",
  });
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.security;
  const securityEmail = getSecurityReportEmail();

  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: content.breadcrumb },
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
        <Container className="relative px-5 py-14 sm:px-6 sm:py-16 lg:py-24">
          <Breadcrumbs items={breadcrumbs} />
          <HeroTitle className="mt-6 max-w-3xl text-foreground">{content.headline}</HeroTitle>
          <BodyText className="mt-4 max-w-2xl text-lg text-muted">{content.lead}</BodyText>
        </Container>
      </section>

      <Container className="px-5 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <ul className="grid gap-4 md:grid-cols-2">
            {content.cards.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 50}>
                <li>
                  <GlassPanel className="h-full p-6">
                    <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                    <BodyText className="mt-2">{item.copy}</BodyText>
                  </GlassPanel>
                </li>
              </ScrollReveal>
            ))}
          </ul>

          <ScrollReveal>
            <section className="mt-14 rounded-[var(--radius-card)] border border-border bg-surface/50 p-6 sm:p-8">
              <Title as="h2" className="text-xl">
                {content.report.heading}
              </Title>
              <ReportIntro text={content.report.intro} email={securityEmail} />
              <ul className="mt-6 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted sm:text-lg">
                {content.report.guidelines.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <details className="mt-10 rounded-[var(--radius-card)] border border-border bg-surface p-5">
              <summary className="cursor-pointer font-medium text-foreground">
                {content.technicalHeading}
              </summary>
              <div className="mt-4 space-y-3 text-muted">
                {content.technical.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          </ScrollReveal>
        </div>
      </Container>
    </>
  );
}
