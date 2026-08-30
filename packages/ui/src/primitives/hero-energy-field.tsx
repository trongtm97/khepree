import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export interface HeroEnergyFieldProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: "soft" | "medium";
}

/** Slow cyan-teal radial energy field — hero and technology focal bands. Decorative only. */
export function HeroEnergyField({
  intensity = "medium",
  className,
  ...props
}: HeroEnergyFieldProps) {
  const opacity = intensity === "soft" ? "opacity-70" : "opacity-100";

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", opacity, className)}
      {...props}
    >
      <div className="motion-energy-field absolute top-[8%] left-1/2 h-[75%] w-[min(100%,48rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(6_182_212/0.16)_0%,rgb(13_148_136/0.07)_42%,transparent_72%)] blur-3xl" />
      <div className="motion-energy-field absolute right-[10%] bottom-[5%] h-[55%] w-[45%] rounded-full bg-[radial-gradient(circle,rgb(13_148_136/0.1)_0%,transparent_68%)] blur-3xl [animation-delay:-12s]" />
    </div>
  );
}
