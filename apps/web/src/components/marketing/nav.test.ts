import { describe, expect, it } from "vitest";
import { en } from "@/messages/en";
import {
  ABOUT_PATH,
  RESOURCE_NAV_KEYS,
  RESOURCE_NAV_LABEL_KEYS,
  RESOURCE_NAV_PATHS,
  SUPPORT_NAV_KEYS,
  SUPPORT_NAV_LABEL_KEYS,
  SUPPORT_NAV_PATHS,
} from "./nav";

describe("marketing nav contract", () => {
  it("maps every resource key to a path and nav message", () => {
    for (const key of RESOURCE_NAV_KEYS) {
      expect(RESOURCE_NAV_PATHS[key]).toMatch(/^\//);
      expect(en.nav[RESOURCE_NAV_LABEL_KEYS[key]]).toBeTruthy();
    }
  });

  it("maps every support key to a path and nav message", () => {
    for (const key of SUPPORT_NAV_KEYS) {
      expect(SUPPORT_NAV_PATHS[key]).toMatch(/^\//);
      expect(en.nav[SUPPORT_NAV_LABEL_KEYS[key]]).toBeTruthy();
    }
  });

  it("about path is stable", () => {
    expect(ABOUT_PATH).toBe("/about");
  });

  it("does not link legacy global pricing or solutions hubs", () => {
    const paths = [...Object.values(RESOURCE_NAV_PATHS), ...Object.values(SUPPORT_NAV_PATHS), ABOUT_PATH];
    expect(paths.some((path) => path === "/pricing" || path.startsWith("/solutions"))).toBe(false);
  });
});
