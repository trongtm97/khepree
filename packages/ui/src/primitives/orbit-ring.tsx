import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export interface OrbitRingProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  reverse?: boolean;
  /** Luminous nodes on the path — renewal / forward motion metaphor. */
  nodes?: 1 | 2 | 3;
  tilt?: number;
}

const sizes = {
  sm: "h-32 w-32",
  md: "h-48 w-48",
  lg: "h-64 w-64",
};

const nodeAngles: Record<NonNullable<OrbitRingProps["nodes"]>, number[]> = {
  1: [270],
  2: [270, 90],
  3: [270, 30, 150],
};

/** SVG orbit paths with slow luminous nodes — abstract forward-motion accent. */
export function OrbitRing({
  size = "md",
  reverse = false,
  nodes = 1,
  tilt = 0,
  className,
  ...props
}: OrbitRingProps) {
  const orbitClass = reverse ? "motion-orbit-reverse" : "motion-orbit";
  const angles = nodeAngles[nodes];

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute", sizes[size], className)}
      style={tilt ? { transform: `rotateX(${tilt}deg)` } : undefined}
      {...props}
    >
      <div className={cn("absolute inset-0 origin-center", orbitClass)}>
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="46"
            fill="none"
            stroke="rgb(13 148 136 / 0.22)"
            strokeWidth="0.6"
            strokeDasharray="3 6"
          />
        </svg>
        {angles.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 46 * Math.cos(rad);
          const y = 50 + 46 * Math.sin(rad);
          return (
            <span
              key={angle}
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/85 shadow-[0_0_10px_rgb(6_182_212/0.55)]"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
