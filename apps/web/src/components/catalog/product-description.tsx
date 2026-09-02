"use client";

import { cn } from "@khepree/ui";
import { useLayoutEffect, useRef, useState } from "react";

const COLLAPSED_MAX_PX = 352;

type Props = {
  html: string;
  expandLabel: string;
  collapseLabel: string;
};

export function ProductDescription({ html, expandLabel, collapseLabel }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const measure = () => {
      setCanExpand(node.scrollHeight > COLLAPSED_MAX_PX);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [html]);

  const collapsed = canExpand && !expanded;

  return (
    <div className="mt-12">
      <div className="relative">
        <div
          ref={contentRef}
          className={cn("product-description-prose", collapsed && "max-h-[22rem] overflow-hidden")}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {collapsed ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {canExpand ? (
        <button
          type="button"
          className="mt-4 text-sm font-medium text-teal hover:underline"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      ) : null}
    </div>
  );
}
