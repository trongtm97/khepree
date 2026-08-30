import type { ReactNode } from "react";
import type { PublishedContent } from "@khepree/catalog";
import { Container } from "@khepree/ui";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export function DocsArticleLayout({
  locale,
  messages,
  entries,
  currentSlug,
  title,
  breadcrumbs,
  children,
}: {
  locale: SupportedLocale;
  messages: Messages;
  entries: PublishedContent[];
  currentSlug: string;
  title: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  children: ReactNode;
}) {
  const index = entries.findIndex((entry) => entry.slug === currentSlug);
  const prev = index > 0 ? entries[index - 1] : null;
  const next = index >= 0 && index < entries.length - 1 ? entries[index + 1] : null;

  return (
    <Container className="px-5 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,12rem)]">
        <aside className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {messages.pages.docs.title}
          </p>
          <nav aria-label="Documentation" className="mt-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <ul className="space-y-0.5">
              {entries.map((entry) => {
                const active = entry.slug === currentSlug;
                return (
                  <li key={entry.entryPublicId}>
                    <Link
                      href={localePath(locale, `/docs/${entry.slug}`)}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-border-subtle font-medium text-foreground"
                          : "text-muted hover:bg-border-subtle hover:text-foreground"
                      }`}
                    >
                      {entry.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 w-full">
          <details className="mb-6 rounded-[var(--radius-card)] border border-border bg-surface p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              {messages.pages.docs.title}
            </summary>
            <nav aria-label="Documentation" className="mt-4 max-h-64 overflow-y-auto">
              <ul className="space-y-0.5">
                {entries.map((entry) => {
                  const active = entry.slug === currentSlug;
                  return (
                    <li key={entry.entryPublicId}>
                      <Link
                        href={localePath(locale, `/docs/${entry.slug}`)}
                        aria-current={active ? "page" : undefined}
                        className={`block min-h-11 rounded-[var(--radius-control)] px-3 py-2 text-sm leading-6 transition-colors ${
                          active
                            ? "bg-border-subtle font-medium text-foreground"
                            : "text-muted hover:bg-border-subtle hover:text-foreground"
                        }`}
                      >
                        {entry.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </details>
          <Breadcrumbs items={breadcrumbs} />
          <header className="mt-6 border-b border-border pb-6">
            <h1 className="type-title text-foreground">{title}</h1>
          </header>
          <div className="article-prose mt-8 w-full max-w-none">{children}</div>
          {(prev || next) && (
            <nav
              aria-label="Documentation pages"
              className="mt-12 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:justify-between"
            >
              {prev ? (
                <Link
                  href={localePath(locale, `/docs/${prev.slug}`)}
                  className="text-sm font-medium text-teal hover:underline"
                >
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={localePath(locale, `/docs/${next.slug}`)}
                  className="text-sm font-medium text-teal hover:underline sm:text-right"
                >
                  {next.title} →
                </Link>
              ) : null}
            </nav>
          )}
        </article>
      </div>
    </Container>
  );
}
