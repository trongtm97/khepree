import { cn } from "../lib/cn";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

type TypographyProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>;

export function Display({ as: Tag = "h1", className, children, ...props }: TypographyProps) {
  return (
    <Tag className={cn("type-display text-balance text-foreground", className)} {...props}>
      {children}
    </Tag>
  );
}

export function HeroTitle({ as: Tag = "h1", className, children, ...props }: TypographyProps) {
  return (
    <Tag className={cn("type-hero text-balance text-foreground", className)} {...props}>
      {children}
    </Tag>
  );
}

export function Title({ as: Tag = "h2", className, children, ...props }: TypographyProps) {
  return (
    <Tag className={cn("type-title text-balance text-foreground", className)} {...props}>
      {children}
    </Tag>
  );
}

export function BodyText({ as: Tag = "p", className, children, ...props }: TypographyProps) {
  return (
    <Tag className={cn("type-body text-muted", className)} {...props}>
      {children}
    </Tag>
  );
}

export function SmallText({ as: Tag = "p", className, children, ...props }: TypographyProps) {
  return (
    <Tag className={cn("type-small text-muted", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CapsLabel({ as: Tag = "span", className, children, ...props }: TypographyProps) {
  return (
    <Tag className={cn("type-caps text-muted", className)} {...props}>
      {children}
    </Tag>
  );
}
