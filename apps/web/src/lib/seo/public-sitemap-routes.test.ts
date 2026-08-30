import { describe, expect, it } from "vitest";
import {
  PUBLIC_SITEMAP_EXCLUDED_PATHS,
  PUBLIC_SITEMAP_STATIC_ROUTES,
} from "./public-sitemap-routes";

describe("public sitemap routes", () => {
  it("includes trust, support, changelog, and legal pages", () => {
    expect(PUBLIC_SITEMAP_STATIC_ROUTES).toEqual(
      expect.arrayContaining([
        "/support",
        "/trust",
        "/changelog",
        "/refund",
        "/eula",
        "/cookies",
        "/privacy",
        "/terms",
      ]),
    );
  });

  it("keeps core catalog and content hubs", () => {
    expect(PUBLIC_SITEMAP_STATIC_ROUTES).toEqual(
      expect.arrayContaining(["", "/products", "/about", "/contact", "/blog", "/docs", "/security"]),
    );
  });

  it("excludes legacy redirect hubs from the static list", () => {
    for (const path of PUBLIC_SITEMAP_EXCLUDED_PATHS) {
      expect(PUBLIC_SITEMAP_STATIC_ROUTES).not.toContain(path);
    }
  });
});
