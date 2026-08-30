"use client";

import { cn } from "@khepree/ui";
import type { ContentHeading } from "@/lib/content-headings";

export function ArticleToc({
  headings,
  label,
}: {
  headings: ContentHeading[];
  label: string;
}) {
  if (headings.length < 2) return null;

  return (
    <nav aria-label={label} className="hidden xl:block">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ul className="mt-3 space-y-2 border-l border-border pl-3">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block text-sm text-muted transition-colors hover:text-teal",
                heading.level === 3 && "pl-3",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
