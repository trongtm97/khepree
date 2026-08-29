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
        <label htmlFor={inputId} className="text-sm font-medium text-khepree-ink">
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
          "h-11 w-full rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white px-3.5 text-sm text-khepree-ink placeholder:text-khepree-slate/50",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-khepree-teal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="text-xs text-khepree-slate/70">
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
