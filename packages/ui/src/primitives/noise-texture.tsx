import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export interface NoiseTextureProps extends HTMLAttributes<HTMLDivElement> {
  opacity?: number;
}

/** SVG noise overlay for depth — lightweight, no image assets. */
export function NoiseTexture({ opacity = 0.04, className, ...props }: NoiseTextureProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
      {...props}
    />
  );
}
