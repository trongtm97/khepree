import Link from "next/link";
import { accountPublicUrl, getOutboundLinkAttributes } from "@khepree/config";
import {
  BodyText,
  Container,
  GlassPanel,
  GradientMesh,
  HeroEnergyField,
  HeroTitle,
  Title,
} from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { listPublishedContent } from "@/lib/content";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { createPageBreadcrumbs, pageBreadcrumbJsonLd } from "@/lib/seo/page-breadcrumbs";
import { notFound } from "next/navigation";

function resolveCategoryHref(
  locale: SupportedLocale,
  category: { hrefKind: string; path: string },
): { href: string; openInNewTab?: boolean } {
  if (category.hrefKind === "account") {
    return { href: `${accountPublicUrl()}/${category.path.replace(/^\//, "")}`, openInNewTab: true };
  }
  return { href: localePath(locale, category.path) };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.support;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/support",
  });
}

export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.support;
  const docs = (await listPublishedContent("doc", locale))
    .filter((entry) => entry.publishedAt)
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, 6);

  const breadcrumbs = createPageBreadcrumbs(locale, messages, {
    label: content.breadcrumb,
    href: localePath(locale, "/support"),
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
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {content.categories.map((category, index) => {
              const link = resolveCategoryHref(locale, category);
              return (
                <ScrollReveal key={category.title} delay={index * 50}>
                  <GlassPanel className="flex h-full flex-col p-6">
                    <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
                    <BodyText className="mt-3 flex-1">{category.copy}</BodyText>
                    <p className="mt-4">
                      <Link
                        href={link.href}
                        className="font-medium text-teal hover:underline"
                        {...getOutboundLinkAttributes(link.href, { forceNewTab: link.openInNewTab })}
                      >
                        {category.linkLabel}
                      </Link>
                    </p>
                  </GlassPanel>
                </ScrollReveal>
              );
            })}
          </div>

          <ScrollReveal>
            <section className="mt-14">
              <Title as="h2" className="text-xl">
                {content.docsHeading}
              </Title>
              {docs.length > 0 ? (
                <ul className="mt-4 divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface/50">
                  {docs.map((entry) => (
                    <li key={entry.entryPublicId}>
                      <Link
                        href={localePath(locale, `/docs/${entry.slug}`)}
                        className="block px-5 py-4 transition-colors hover:bg-border-subtle"
                      >
                        <span className="font-medium text-foreground">{entry.title}</span>
                        {entry.excerpt ? (
                          <span className="mt-1 block text-sm text-muted">{entry.excerpt}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-base text-muted">{content.docsEmpty}</p>
              )}
            </section>
          </ScrollReveal>
        </div>
      </Container>
    </>
  );
}
