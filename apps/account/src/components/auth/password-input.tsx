"use client";

import { cn } from "@khepree/ui";
import { useState } from "react";
import type { AuthCopy } from "@/lib/auth-ui";

export function PasswordInput({
  label,
  autoComplete,
  required,
  minLength,
  hint,
  value,
  onChange,
  copy,
}: {
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  copy: AuthCopy;
}) {
  const [visible, setVisible] = useState(false);
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(
            "h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 pr-11 text-sm text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:border-teal/40",
          )}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted hover:text-foreground"
          aria-label={visible ? copy.hidePassword : copy.showPassword}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? copy.hidePassword : copy.showPassword}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
