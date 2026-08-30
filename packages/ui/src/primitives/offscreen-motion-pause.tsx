"use client";

import { cn } from "../lib/cn";
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

export interface OffscreenMotionPauseProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Pauses decorative CSS animations when the block leaves the viewport. */
export function OffscreenMotionPause({ children, className, ...props }: OffscreenMotionPauseProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.dataset.motionPaused = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        node.dataset.motionPaused = entry?.isIntersecting ? "false" : "true";
      },
      { rootMargin: "64px 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(className)} {...props}>
      {children}
    </div>
  );
}
