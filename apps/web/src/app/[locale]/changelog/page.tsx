import { downloadPublicUrl } from "@khepree/config";
import { BodyText, Container, EmptyState, GradientMesh, HeroEnergyField, HeroTitle } from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ChangelogFeed, type ChangelogEntryView } from "@/components/marketing/changelog-feed";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { getPublicChangelog } from "@/lib/releases";
import { createPageMetadata } from "@/lib/seo/metadata";
import { createPageBreadcrumbs, pageBreadcrumbJsonLd } from "@/lib/seo/page-breadcrumbs";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.changelog;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/changelog",
  });
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.changelog;
  const entries = await getPublicChangelog(locale);
  const feedEntries: ChangelogEntryView[] = entries.map((entry) => ({
    releasePublicId: entry.releasePublicId,
    productSlug: entry.productSlug,
    productName: entry.productName,
    version: entry.version,
    platform: entry.platform,
    architecture: entry.architecture,
    channel: entry.channel,
    publishedAt: entry.publishedAt.toISOString(),
    releaseNotes: entry.releaseNotes,
  }));

  const breadcrumbs = createPageBreadcrumbs(locale, messages, {
    label: content.breadcrumb,
    href: localePath(locale, "/changelog"),
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
        <div className="mx-auto max-w-3xl">
          {feedEntries.length > 0 ? (
            <ScrollReveal>
              <ChangelogFeed
                entries={feedEntries}
                locale={locale}
                accountDownloadsUrl={downloadPublicUrl()}
                labels={{
                  allProducts: content.allProducts,
                  version: content.version,
                  released: content.released,
                  platform: content.platform,
                  channel: content.channel,
                  releaseNotes: content.releaseNotes,
                  viewProduct: content.viewProduct,
                  downloads: content.downloads,
                }}
              />
            </ScrollReveal>
          ) : (
            <ScrollReveal>
              <EmptyState title={content.emptyTitle} description={content.emptyDescription} />
            </ScrollReveal>
          )}
        </div>
      </Container>
    </>
  );
}
