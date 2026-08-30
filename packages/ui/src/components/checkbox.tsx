import { cn } from "../lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: string;
}

export function Checkbox({ className, label, description, id, ...props }: CheckboxProps) {
  const checkboxId =
    id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : "checkbox");

  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={checkboxId}
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded border-khepree-mist text-khepree-teal",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-khepree-teal",
          className,
        )}
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={checkboxId} className="text-sm font-medium text-khepree-ink">
          {label}
        </label>
        {description ? (
          <span className="text-xs text-khepree-slate/70">{description}</span>
        ) : null}
      </div>
    </div>
  );
}
