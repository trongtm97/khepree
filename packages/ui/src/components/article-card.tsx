import { Badge } from "./badge";
import { Card, CardDescription, CardTitle } from "./card";
import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

export interface ArticleCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  excerpt?: string;
  meta?: string;
  tag?: string;
  image?: { src: string; alt: string };
}

/** Blog/docs article preview card. */
export function ArticleCard({
  title,
  excerpt,
  meta,
  tag,
  image,
  className,
  ...props
}: ArticleCardProps) {
  return (
    <Card variant="interactive" className={cn("flex h-full flex-col overflow-hidden p-0", className)} {...props}>
      {image ? (
        <div className="h-40 overflow-hidden bg-background">
          <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          aria-hidden
          className="h-1.5 bg-gradient-to-r from-teal via-cyan to-indigo motion-gradient-drift"
        />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          {tag ? <Badge variant="teal">{tag}</Badge> : <span />}
          {meta ? <span className="type-small text-muted">{meta}</span> : null}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        {excerpt ? <CardDescription className="line-clamp-3 flex-1">{excerpt}</CardDescription> : null}
      </div>
    </Card>
  );
}
