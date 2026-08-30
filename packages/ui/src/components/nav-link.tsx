import { cn } from "../lib/cn";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface NavLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  children: ReactNode;
}

/** Primary navigation link with premium hover/active states. */
export function NavLink({ active, className, children, ...props }: NavLinkProps) {
  return (
    <a
      className={cn(
        "relative text-sm transition-colors duration-[var(--motion-fast)]",
        active ? "font-medium text-foreground" : "text-muted hover:text-foreground",
        !active &&
          "after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-teal after:transition-[width] after:duration-[var(--motion-base)] hover:after:w-full",
        className,
      )}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {children}
    </a>
  );
}
