import { EmptyState } from "@khepree/ui";
import type { ContentType } from "@khepree/catalog";
import Link from "next/link";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { listPublishedContent } from "@/lib/content";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageBreadcrumbs, pageBreadcrumbLabel } from "@/lib/seo/page-breadcrumbs";

export async function PublishedContentIndex({
  locale,
  messages,
  contentType,
  pathPrefix,
}: {
  locale: SupportedLocale;
  messages: Messages;
  contentType: Extract<ContentType, "article" | "doc">;
  pathPrefix: "/blog" | "/docs";
}) {
  const page = contentType === "article" ? messages.pages.blog : messages.pages.docs;
  const entries = await listPublishedContent(contentType, locale);

  return (
    <MarketingPageLayout
      title={page.title}
      description={page.description}
      breadcrumbs={createPageBreadcrumbs(locale, messages, {
        label: pageBreadcrumbLabel(page),
        href: localePath(locale, pathPrefix),
      })}
    >
      <p>{page.intro}</p>
      {entries.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {entries.map((entry) => (
            <li key={entry.entryPublicId}>
              <Link
                href={localePath(locale, `${pathPrefix}/${entry.slug}`)}
                className="block rounded-[var(--radius-card)] border border-border p-5 transition-colors hover:border-teal/40"
              >
                <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
                {entry.excerpt ? (
                  <p className="mt-2 text-sm text-muted">{entry.excerpt}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState title={page.emptyTitle} description={page.emptyDescription} />
        </div>
      )}
    </MarketingPageLayout>
  );
}
