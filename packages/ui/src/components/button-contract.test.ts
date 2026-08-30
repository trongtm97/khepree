import { describe, expect, it } from "vitest";
import {
  buttonClassName,
  buttonMobileFullWidthClass,
  buttonSizes,
  buttonVariants,
  ctaButtonGroupClass,
} from "./button-contract";

describe("button-contract", () => {
  it("accent includes softened gradient and highlight", () => {
    expect(buttonVariants.accent).toContain("from-teal");
    expect(buttonVariants.accent).toContain("to-cyan/95");
    expect(buttonVariants.accent).toContain("via-white/25");
  });

  it("secondaryDark uses glass on dark surfaces", () => {
    expect(buttonVariants.secondaryDark).toContain("bg-white/[0.06]");
    expect(buttonVariants.secondaryDark).toContain("text-white");
    expect(buttonVariants.secondaryDark).not.toContain("bg-white text");
  });

  it("sizes use fixed height without vertical padding bloat", () => {
    expect(buttonSizes.md).toContain("h-11");
    expect(buttonSizes.md).toContain("px-5");
    expect(buttonSizes.md).not.toContain("py-");
    expect(buttonSizes.lg).toContain("h-12");
    expect(buttonSizes.lg).toContain("text-[15px]");
  });

  it("merges focus ring and semibold type into base class", () => {
    expect(buttonClassName({ variant: "accent" })).toContain("focus-visible:ring-teal/55");
    expect(buttonClassName({ variant: "accent" })).toContain("font-semibold");
    expect(buttonClassName({ variant: "accent", showArrow: true })).toContain("gap-2");
  });

  it("supports full-width mobile CTA layout helpers", () => {
    expect(buttonMobileFullWidthClass).toContain("w-full");
    expect(buttonMobileFullWidthClass).toContain("sm:w-auto");
    expect(ctaButtonGroupClass).toContain("flex-col");
    expect(ctaButtonGroupClass).toContain("sm:flex-row");
    expect(ctaButtonGroupClass).not.toContain("[&_a]");
    expect(ctaButtonGroupClass).not.toContain("[&_button]");
  });

  it("sm size stays compact for header CTAs", () => {
    expect(buttonSizes.sm).toContain("h-10");
    expect(buttonSizes.sm).toContain("text-[14px]");
    expect(buttonSizes.sm).not.toContain("py-");
  });
});
