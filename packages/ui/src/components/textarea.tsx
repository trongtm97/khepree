import { cn } from "../lib/cn";
import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ className, label, error, id, ...props }: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={textareaId} className="text-sm font-medium text-khepree-ink">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={cn(
          "min-h-28 w-full rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white px-3.5 py-2.5 text-sm text-khepree-ink placeholder:text-khepree-slate/50",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-khepree-teal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${textareaId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
