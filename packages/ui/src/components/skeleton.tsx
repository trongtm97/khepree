import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[var(--radius-control)] bg-khepree-mist motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
