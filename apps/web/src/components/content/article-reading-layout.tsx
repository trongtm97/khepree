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
          : "max-w-3xl"
      }
    >
      <div className="min-w-0">
        <div className="article-prose max-w-none">{children}</div>
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
