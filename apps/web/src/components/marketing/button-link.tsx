import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
  withOptionalArrow,
} from "@khepree/ui";
import Link from "next/link";
import type { ComponentProps } from "react";

export type { ButtonSize, ButtonVariant };

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  showArrow?: boolean;
  fullWidthMobile?: boolean;
  className?: string;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  showArrow = false,
  fullWidthMobile = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, showArrow, fullWidthMobile, className })}
      {...props}
    >
      {withOptionalArrow(children, showArrow)}
    </Link>
  );
}
