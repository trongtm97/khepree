import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Shared visual contract for `<Button>` and marketing `<ButtonLink>`. */
export type ButtonVariant = "primary" | "accent" | "secondary" | "secondaryDark" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/** Fixed height + horizontal padding only — vertical centering via flex (no py bloat). */
export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-10 min-h-[40px] px-4 text-[14px] leading-[1.25] lg:text-[15px]",
  md: "h-11 min-h-[44px] px-5 text-[15px] leading-[1.25]",
  lg: "h-12 min-h-[48px] px-6 text-[15px] leading-[1.25] sm:text-[16px]",
};

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-teal/20 bg-teal text-white shadow-[var(--shadow-soft)] hover:bg-teal/90 hover:shadow-[0_0_0_1px_rgb(13_148_136/0.12),0_8px_20px_rgb(13_148_136/0.16)]",
  accent: [
    "relative overflow-hidden border border-teal/25 bg-gradient-to-r from-teal via-cyan to-[#5fe7ff] text-white",
    "shadow-[0_1px_2px_rgb(0_0_0/0.12),0_0_0_1px_rgb(25_211_197/0.12),0_8px_24px_rgb(25_211_197/0.2)]",
    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
    "hover:brightness-[1.06] hover:border-teal/35 hover:shadow-[0_0_0_1px_rgb(25_211_197/0.2),0_12px_32px_rgb(25_211_197/0.28)]",
    "motion-safe:hover:-translate-y-px",
  ].join(" "),
  secondary:
    "border border-teal/25 bg-teal/10 text-foreground shadow-[var(--shadow-soft)] hover:border-teal/40 hover:bg-teal/[0.14] hover:shadow-[0_0_0_1px_rgb(13_148_136/0.08),0_8px_20px_rgb(13_148_136/0.1)]",
  secondaryDark:
    "border border-white/18 bg-white/[0.07] text-white backdrop-blur-sm hover:border-teal/45 hover:bg-white/[0.11] hover:shadow-[0_0_0_1px_rgb(25_211_197/0.15),0_0_20px_rgb(25_211_197/0.1)] motion-safe:hover:-translate-y-px",
  ghost: "text-foreground hover:bg-border-subtle/80",
  danger: "border border-red-600/30 bg-red-600 text-white hover:bg-red-700",
};

/** Responsive CTA row — layout only; pair with `fullWidthMobile` on each button/link. */
export const ctaButtonGroupClass =
  "flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3";

export const buttonMobileFullWidthClass = "w-full max-w-full sm:w-auto";

export function buttonBaseClass(options?: { showArrow?: boolean }) {
  return cn(
    "group inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold",
    "whitespace-nowrap text-center",
    "transition-[transform,background-color,border-color,box-shadow,filter] duration-200 ease-[var(--motion-ease-out)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-safe:active:scale-[0.98]",
    options?.showArrow && "motion-safe:motion-parallax-lite",
  );
}

export function buttonClassName(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  showArrow?: boolean;
  fullWidthMobile?: boolean;
  className?: string;
}) {
  const variant = options.variant ?? "primary";
  const size = options.size ?? "md";
  return cn(
    buttonBaseClass({ showArrow: options.showArrow }),
    buttonVariants[variant],
    buttonSizes[size],
    options.fullWidthMobile && buttonMobileFullWidthClass,
    options.className,
  );
}

export function CtaArrow() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function withOptionalArrow(children: ReactNode, showArrow?: boolean) {
  if (!showArrow) return children;
  return (
    <>
      <span className="inline-flex items-center">{children}</span>
      <CtaArrow />
    </>
  );
}
