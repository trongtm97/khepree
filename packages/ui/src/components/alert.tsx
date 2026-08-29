import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

const variants: Record<AlertVariant, string> = {
  info: "border-khepree-cyan/30 bg-khepree-cyan/5 text-khepree-ink",
  success: "border-khepree-teal/30 bg-khepree-teal/5 text-khepree-ink",
  warning: "border-khepree-solar/40 bg-khepree-solar/10 text-khepree-ink",
  error: "border-red-300 bg-red-50 text-khepree-ink",
};

export function Alert({
  className,
  variant = "info",
  title,
  children,
  role = "status",
  ...props
}: AlertProps) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-[var(--radius-control)] border px-4 py-3 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    >
      {title ? <p className="mb-1 font-medium">{title}</p> : null}
      <div className="leading-relaxed opacity-90">{children}</div>
    </div>
  );
}
