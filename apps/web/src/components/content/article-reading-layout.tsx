import type { ReactNode } from "react";
import { ArticleToc } from "./article-toc";
import type { ContentHeading } from "@/lib/content-headings";

export function ArticleReadingLayout({
  headings,
  tocLabel,
  sidebar,
  children,
}: {
  headings: ContentHeading[];
  tocLabel: string;
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  const showToc = headings.length >= 2;

  return (
    <div
      className={
        showToc
          ? "grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]"
          : "w-full max-w-none"
      }
    >
      <div className="min-w-0 w-full">
        {showToc ? (
          <details className="mb-8 rounded-[var(--radius-card)] border border-border bg-surface p-4 xl:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              {tocLabel}
            </summary>
            <div className="mt-4">
              <ArticleToc headings={headings} label={tocLabel} className="[&>p:first-child]:sr-only" />
            </div>
          </details>
        ) : null}
        <div className="article-prose w-full max-w-none px-0">{children}</div>
        {sidebar ? <div className="mt-12">{sidebar}</div> : null}
      </div>
      {showToc ? (
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <ArticleToc headings={headings} label={tocLabel} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
