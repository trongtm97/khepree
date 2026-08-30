import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

type MeshTone = "teal" | "indigo" | "mixed";

const meshes: Record<MeshTone, string> = {
  teal: "from-teal/18 via-cyan/10 to-background",
  indigo: "from-teal/12 via-cyan/8 to-background",
  mixed: "from-teal/14 via-cyan/12 to-background",
};

export interface GradientMeshProps extends HTMLAttributes<HTMLDivElement> {
  tone?: MeshTone;
  animated?: boolean;
}

/** Dimensional background mesh — Stripe/Framer-inspired depth without copying assets. */
export function GradientMesh({
  tone = "mixed",
  animated = true,
  className,
  ...props
}: GradientMeshProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 bg-gradient-to-br",
        meshes[tone],
        animated && "motion-gradient-drift",
        className,
      )}
      {...props}
    />
  );
}
