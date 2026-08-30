"use client";

import { cn } from "@khepree/ui";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return { ref, visible: reducedMotion || revealed };
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms when parent reveals. */
  delay?: number;
}) {
  const { ref, visible } = useRevealOnScroll();
  const style: CSSProperties | undefined =
    visible && delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  return (
    <div
      ref={ref}
      style={style}
      className={cn(visible ? "motion-fade-up" : "opacity-0", className)}
    >
      {children}
    </div>
  );
}

/** Reveals a group with staggered child fade-up (product bento, resources grid). */
export function ScrollRevealStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, visible } = useRevealOnScroll();

  return (
    <div ref={ref} className={cn(visible ? "motion-stagger" : "opacity-0", className)}>
      {children}
    </div>
  );
}
