"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavGroup } from "@/lib/routes";

export function AdminNavList({
  groups,
  onNavigate,
  className,
}: {
  groups: AdminNavGroup[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col gap-4", className)} aria-label="Menu quản trị">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-khepree-slate/50">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-[var(--radius-control)] px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-khepree-mist font-medium text-khepree-ink"
                      : "text-khepree-slate/70 hover:bg-khepree-mist/60 hover:text-khepree-ink",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
