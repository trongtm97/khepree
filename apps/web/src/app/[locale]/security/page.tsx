import { BodyText, Container, GlassPanel, HeroTitle } from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { notFound } from "next/navigation";

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
      <Container className="py-12 lg:py-16">
        <Breadcrumbs items={breadcrumbs} />
        <header className="mt-6 max-w-3xl">
          <HeroTitle>{content.title}</HeroTitle>
          <BodyText className="mt-4 text-lg">{content.description}</BodyText>
        </header>
        <p className="mt-6 max-w-3xl text-muted">{content.intro}</p>

        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {content.benefits.map((item) => (
            <li key={item.title}>
              <GlassPanel className="h-full p-6">
                <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                <BodyText className="mt-2">{item.copy}</BodyText>
              </GlassPanel>
            </li>
          ))}
        </ul>

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

        <p className="mt-8 text-sm text-muted">{content.legalReview}</p>
      </Container>
    </>
  );
}
