import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

type GlowTone = "teal" | "cyan" | "indigo" | "solar";

const tones: Record<GlowTone, string> = {
  teal: "bg-teal/30",
  cyan: "bg-cyan/25",
  indigo: "bg-indigo/25",
  solar: "bg-solar-accent/20",
};

export interface TechGlowProps extends HTMLAttributes<HTMLDivElement> {
  tone?: GlowTone;
  intensity?: "soft" | "medium";
}

/** Soft radial glow for hero and product focal points. Decorative only. */
export function TechGlow({
  tone = "teal",
  intensity = "medium",
  className,
  ...props
}: TechGlowProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      {...props}
    >
      <div
        className={cn(
          "absolute top-0 left-1/2 h-[70%] w-[min(100%,42rem)] -translate-x-1/2 rounded-full blur-3xl",
          tones[tone],
          intensity === "soft" ? "opacity-40" : "opacity-55",
        )}
      />
    </div>
  );
}
