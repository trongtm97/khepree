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
      <div
        role="tablist"
        aria-label="Tabs"
        className="inline-flex gap-1 rounded-[var(--radius-control)] border border-border bg-border-subtle/50 p-1"
      >
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
              "rounded-[calc(var(--radius-control)-2px)] px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-[var(--motion-fast)]",
              active === item.id
                ? "bg-surface text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted hover:text-foreground",
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
          className="py-4 motion-fade-up"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
