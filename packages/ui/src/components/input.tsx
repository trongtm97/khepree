import { cn } from "../lib/cn";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ className, label, error, hint, id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={cn(
          "h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/70",
          "transition-[border-color,box-shadow] duration-[var(--motion-fast)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:border-teal/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
