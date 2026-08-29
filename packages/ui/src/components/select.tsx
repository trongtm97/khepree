import { cn } from "../lib/cn";
import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  className,
  label,
  error,
  options,
  placeholder,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-khepree-ink">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn(
          "h-11 w-full rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white px-3.5 text-sm text-khepree-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-khepree-teal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-400",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${selectId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
