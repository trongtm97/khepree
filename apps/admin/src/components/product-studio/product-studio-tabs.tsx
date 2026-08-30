"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@khepree/ui";

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "content", label: "Nội dung" },
  { id: "plans", label: "Gói & Giá" },
  { id: "features", label: "Tính năng" },
  { id: "media", label: "Media" },
  { id: "licensing", label: "Bản quyền" },
  { id: "releases", label: "Phiên bản" },
  { id: "seo", label: "SEO" },
  { id: "publish", label: "Publish" },
] as const;

export function ProductStudioTabs({ productId: _productId }: { productId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "overview";

  return (
    <nav aria-label="Product Studio tabs" className="flex gap-1 overflow-x-auto border-b border-khepree-mist pb-px">
      {TABS.map((tab) => {
        const href = `${pathname}?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "shrink-0 rounded-t-[var(--radius-control)] px-3 py-2 text-sm",
              active === tab.id
                ? "border border-b-0 border-khepree-mist bg-khepree-white font-medium text-khepree-ink"
                : "text-khepree-slate/70 hover:bg-khepree-mist/50",
            )}
            aria-current={active === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export type StudioTabId = (typeof TABS)[number]["id"];

export function resolveStudioTab(raw: string | null | undefined): StudioTabId {
  const hit = TABS.find((tab) => tab.id === raw);
  return hit?.id ?? "overview";
}
