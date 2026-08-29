"use client";

import { cn } from "../lib/cn";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
}

export function Dropdown({ trigger, items, align = "start", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((v) => !v)} onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}>
        {trigger}
      </div>
      {open ? (
        <ul
          role="menu"
          className={cn(
            "absolute z-50 mt-2 min-w-40 rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white py-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-khepree-ink hover:bg-khepree-mist disabled:opacity-50"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
