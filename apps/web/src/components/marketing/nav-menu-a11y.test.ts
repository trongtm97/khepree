import { describe, expect, it } from "vitest";
import { productMegaMenuColumns, productMegaMenuWidth } from "./nav-menu-a11y";

describe("productMegaMenuColumns", () => {
  it("uses 1 column for small catalogs", () => {
    expect(productMegaMenuColumns(2)).toBe(1);
  });

  it("uses 2 columns for medium catalogs", () => {
    expect(productMegaMenuColumns(5)).toBe(2);
  });

  it("uses 3 columns for large catalogs", () => {
    expect(productMegaMenuColumns(10)).toBe(3);
  });
});

describe("productMegaMenuWidth", () => {
  it("widens with column count", () => {
    expect(productMegaMenuWidth(1)).toContain("22rem");
    expect(productMegaMenuWidth(3)).toContain("52rem");
  });
});
