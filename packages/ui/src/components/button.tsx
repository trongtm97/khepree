import { cn } from "../lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
  withOptionalArrow,
} from "./button-contract";

export type { ButtonSize, ButtonVariant };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  showArrow?: boolean;
  fullWidthMobile?: boolean;
  children: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  showArrow = false,
  fullWidthMobile = false,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClassName({ variant, size, showArrow, fullWidthMobile, className }))}
      {...props}
    >
      {withOptionalArrow(children, showArrow)}
    </button>
  );
}
