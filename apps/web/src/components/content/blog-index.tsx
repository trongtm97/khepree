import type { PublishedContent } from "@khepree/catalog";
import { ArticleCard, BodyText, CapsLabel, Container, EmptyState, HeroTitle } from "@khepree/ui";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { listPublishedContent } from "@/lib/content";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageBreadcrumbs, pageBreadcrumbJsonLd, pageBreadcrumbLabel } from "@/lib/seo/page-breadcrumbs";

function sortByDate(entries: PublishedContent[]) {
  return [...entries].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function BlogIndex({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  const page = messages.pages.blog;
  const entries = sortByDate(await listPublishedContent("article", locale));
  const [featured, ...recent] = entries;
  const categories = [...new Set(entries.map((e) => e.categoryName).filter(Boolean))] as string[];

  const breadcrumbs = createPageBreadcrumbs(locale, messages, {
    label: pageBreadcrumbLabel(page),
    href: localePath(locale, "/blog"),
  });

  return (
    <>
      <JsonLd data={pageBreadcrumbJsonLd(breadcrumbs)} />
      <Container className="px-5 py-12 sm:px-6 lg:py-16">
        <Breadcrumbs items={breadcrumbs} />
        <header className="mt-6 max-w-3xl">
          <HeroTitle>{page.title}</HeroTitle>
          <BodyText className="mt-4 text-base leading-relaxed sm:text-lg">{page.description}</BodyText>
        </header>

        {entries.length === 0 ? (
          <div className="mt-12">
            <EmptyState title={page.emptyTitle} description={page.emptyDescription} />
          </div>
        ) : (
          <>
            {featured ? (
              <Link
                href={localePath(locale, `/blog/${featured.slug}`)}
                className="group mt-12 block overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-elevated)] transition-transform motion-safe:group-hover:-translate-y-0.5"
              >
                <div className="grid lg:grid-cols-5">
                  <div className="h-2 bg-gradient-to-r from-teal via-cyan to-indigo lg:col-span-5" />
                  <div className="p-6 sm:p-8 lg:col-span-3 lg:p-10">
                    <CapsLabel>{messages.footer.blog}</CapsLabel>
                    {featured.categoryName ? (
                      <p className="mt-2 text-sm font-medium text-teal">{featured.categoryName}</p>
                    ) : null}
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground group-hover:text-teal">
                      {featured.title}
                    </h2>
                    {featured.excerpt ? (
                      <BodyText className="mt-4 text-lg">{featured.excerpt}</BodyText>
                    ) : null}
                  </div>
                  <div className="hidden border-l border-border bg-background/50 p-8 lg:col-span-2 lg:flex lg:items-end">
                    <p className="text-sm text-muted">{page.featuredLabel}</p>
                  </div>
                </div>
              </Link>
            ) : null}

            {categories.length > 1 ? (
              <div className="mt-10 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-[var(--radius-pill)] border border-border px-3 py-1 text-sm text-muted"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}

            {recent.length > 0 ? (
              <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recent.map((entry) => (
                  <li key={entry.entryPublicId}>
                    <Link href={localePath(locale, `/blog/${entry.slug}`)} className="block h-full">
                      <ArticleCard
                        title={entry.title}
                        excerpt={entry.excerpt ?? undefined}
                        tag={entry.categoryName ?? messages.footer.blog}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </Container>
    </>
  );
}
