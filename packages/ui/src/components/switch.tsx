"use client";

import { cn } from "../lib/cn";
import { useId } from "react";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: SwitchProps) {
  const id = useId();

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-khepree-ink">
          {label}
        </label>
        {description ? (
          <span className="text-xs text-khepree-slate/70">{description}</span>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked ?? defaultChecked ?? false}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!(checked ?? defaultChecked ?? false))}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-khepree-teal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked || defaultChecked ? "bg-khepree-teal" : "bg-khepree-mist",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none inline-block size-5 rounded-full bg-khepree-white shadow transition-transform",
            checked || defaultChecked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
