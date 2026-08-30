import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export interface DataFlowLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DataFlowProps extends HTMLAttributes<SVGSVGElement> {
  lines: DataFlowLine[];
  hub?: { x: number; y: number };
  viewBox?: string;
}

/** Animated connection lines — ecosystem / technology diagrams. SVG stroke only. */
export function DataFlow({
  lines,
  hub,
  viewBox = "0 0 800 600",
  className,
  ...props
}: DataFlowProps) {
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={cn("absolute inset-0 h-full w-full text-teal/30", className)}
      {...props}
    >
      {lines.map((line, index) => (
        <line
          key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="currentColor"
          strokeWidth="1"
          className="motion-flow-line"
          style={{ animationDelay: `${index * 0.45}s` }}
        />
      ))}
      {hub ? (
        <>
          <circle cx={hub.x} cy={hub.y} r="3.5" className="fill-cyan/50" />
          <circle cx={hub.x} cy={hub.y} r="8" className="fill-none stroke-cyan/25 stroke-[0.5]" />
        </>
      ) : null}
    </svg>
  );
}
