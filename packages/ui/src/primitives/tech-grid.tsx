import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export interface TechGridProps extends HTMLAttributes<HTMLDivElement> {
  density?: "coarse" | "fine";
  perspective?: boolean;
}

/** Subtle perspective engineering grid — low opacity, fades toward edges. */
export function TechGrid({
  density = "coarse",
  perspective = true,
  className,
  ...props
}: TechGridProps) {
  const size = density === "fine" ? "24px" : "40px";

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 opacity-[0.22]", className)}
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
        `,
        backgroundSize: `${size} ${size}`,
        maskImage: "radial-gradient(ellipse at center, black 12%, transparent 72%)",
        transform: perspective ? "perspective(900px) rotateX(14deg) scale(1.08)" : undefined,
        transformOrigin: "center 40%",
      }}
      {...props}
    />
  );
}
