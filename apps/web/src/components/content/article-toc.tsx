import { cn } from "@khepree/ui";
import type { ContentHeading } from "@/lib/content-headings";

export function ArticleToc({
  headings,
  label,
  className,
}: {
  headings: ContentHeading[];
  label: string;
  className?: string;
}) {
  if (headings.length < 2) return null;

  return (
    <nav aria-label={label} className={cn(className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ul className="mt-3 space-y-2 border-l border-border pl-3">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block min-h-11 py-1 text-sm leading-6 text-muted transition-colors hover:text-teal sm:min-h-0 sm:py-0",
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
