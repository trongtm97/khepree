"use client";

import { cn } from "../lib/cn";
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

export interface CursorSpotlightProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Desktop-only pointer spotlight for technology sections. Disabled on touch and reduced motion. */
export function CursorSpotlight({ children, className, ...props }: CursorSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 40 });

  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(pointer.matches && !reduced.matches);
    update();
    pointer.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      pointer.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!enabled || event.pointerType === "touch") return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  }

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      onPointerMove={enabled ? handlePointerMove : undefined}
      {...props}
    >
      {enabled ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 320px at ${position.x}% ${position.y}%, rgb(6 182 212 / 0.07), transparent 72%)`,
          }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
