import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
}

const sizes = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  full: "max-w-full",
};

export function Container({ className, children, size = "lg", ...props }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", sizes[size], className)} {...props}>
      {children}
    </div>
  );
}
