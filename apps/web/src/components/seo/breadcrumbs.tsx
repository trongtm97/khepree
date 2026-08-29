import Link from "next/link";
import { cn } from "@khepree/ui";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-khepree-slate/70">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-khepree-ink">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "font-medium text-khepree-ink")} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
