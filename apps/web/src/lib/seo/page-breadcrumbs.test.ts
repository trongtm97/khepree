import { describe, expect, it } from "vitest";
import { en } from "@/messages/en";
import { vi } from "@/messages/vi";
import { createPageBreadcrumbs, homeBreadcrumb, pageBreadcrumbJsonLd, pageBreadcrumbLabel } from "./page-breadcrumbs";

describe("homeBreadcrumb", () => {
  it("uses common.home, not meta.siteName", () => {
    expect(homeBreadcrumb("en", en).label).toBe("Home");
    expect(homeBreadcrumb("vi", vi).label).toBe("Trang chủ");
    expect(homeBreadcrumb("en", en).label).not.toBe(en.meta.siteName);
  });
});

describe("createPageBreadcrumbs", () => {
  it("prefixes home link before tail items", () => {
    const trail = createPageBreadcrumbs("en", en, { label: "About Khepree", href: "/en/about" });
    expect(trail).toHaveLength(2);
    expect(trail[0]?.label).toBe("Home");
    expect(trail[1]?.label).toBe("About Khepree");
  });
});

describe("pageBreadcrumbLabel", () => {
  it("prefers breadcrumb over title", () => {
    expect(pageBreadcrumbLabel({ title: "Long SEO | pipe title", breadcrumb: "About Khepree" })).toBe(
      "About Khepree",
    );
    expect(pageBreadcrumbLabel({ title: "Blog" })).toBe("Blog");
  });
});

describe("pageBreadcrumbJsonLd", () => {
  it("includes current page when href is set", () => {
    const data = pageBreadcrumbJsonLd([
      { label: "Home", href: "/en" },
      { label: "About Khepree", href: "/en/about" },
    ]);
    const elements = data.itemListElement as Array<{ name: string; position: number }>;
    expect(elements).toHaveLength(2);
    expect(elements[1]?.name).toBe("About Khepree");
  });
});
