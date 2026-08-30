import type { PublishedContent } from "@khepree/catalog";
import { BodyText, Container, EmptyState, HeroTitle } from "@khepree/ui";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { listPublishedContent } from "@/lib/content";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

export async function DocsIndex({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  const page = messages.pages.docs;
  const entries = await listPublishedContent("doc", locale);

  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: page.title },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          breadcrumbs.filter((b) => b.href).map((b) => ({ name: b.label, href: b.href! })),
        )}
      />
      <Container className="py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{page.title}</p>
            <DocsNav entries={entries} locale={locale} />
          </aside>
          <div>
            <Breadcrumbs items={breadcrumbs} />
            <header className="mt-6 max-w-2xl">
              <HeroTitle>{page.title}</HeroTitle>
              <BodyText className="mt-4 text-lg">{page.description}</BodyText>
            </header>
            <p className="mt-6 max-w-2xl text-muted">{page.intro}</p>
            {entries.length > 0 ? (
              <div className="mt-8 lg:hidden">
                <DocsNav entries={entries} locale={locale} />
              </div>
            ) : (
              <div className="mt-10">
                <EmptyState title={page.emptyTitle} description={page.emptyDescription} />
              </div>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

function DocsNav({ entries, locale }: { entries: PublishedContent[]; locale: SupportedLocale }) {
  if (entries.length === 0) return null;
  return (
    <nav aria-label="Documentation" className="mt-4">
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.entryPublicId}>
            <Link
              href={localePath(locale, `/docs/${entry.slug}`)}
              className="block rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted transition-colors hover:bg-border-subtle hover:text-foreground"
            >
              {entry.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
