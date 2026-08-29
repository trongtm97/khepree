"use client";

import { cn } from "../lib/cn";
import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ items, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id ?? "");

  const activeItem = items.find((item) => item.id === active) ?? items[0];

  return (
    <div className={className}>
      <div role="tablist" aria-label="Tabs" className="flex gap-1 border-b border-khepree-mist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`panel-${item.id}`}
            id={`tab-${item.id}`}
            onClick={() => setActive(item.id)}
            className={cn(
              "rounded-t-[var(--radius-control)] px-4 py-2.5 text-sm font-medium transition-colors",
              active === item.id
                ? "border-b-2 border-khepree-teal text-khepree-teal"
                : "text-khepree-slate/70 hover:text-khepree-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem ? (
        <div
          role="tabpanel"
          id={`panel-${activeItem.id}`}
          aria-labelledby={`tab-${activeItem.id}`}
          className="py-4"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
