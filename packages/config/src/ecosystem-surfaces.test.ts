import { afterEach, describe, expect, it } from "vitest";
import {
  accountSignInUrl,
  accountSignUpUrl,
  appPublicUrl,
  listEcosystemFooterSurfaces,
  listEcosystemNavSurfaces,
  marketingPublicUrl,
  statusPublicUrl,
} from "./ecosystem-surfaces";

afterEach(() => {
  for (const key of [
    "WEB_URL",
    "NEXT_PUBLIC_WEB_URL",
    "APP_URL",
    "NEXT_PUBLIC_APP_URL",
    "ACCOUNT_URL",
    "NEXT_PUBLIC_ACCOUNT_URL",
    "PARTNER_URL",
    "STATUS_URL",
    "NEXT_PUBLIC_STATUS_URL",
    "NODE_ENV",
  ]) {
    delete process.env[key];
  }
  process.env.NODE_ENV = "test";
});

describe("ecosystem-surfaces", () => {
  it("hides app surface when APP_URL matches marketing", () => {
    process.env.WEB_URL = "https://khepree.com";
    process.env.APP_URL = "https://khepree.com";
    expect(appPublicUrl()).toBeNull();
  });

  it("lists footer surfaces only when configured", () => {
    process.env.ACCOUNT_URL = "https://account.example.com";
    process.env.PARTNER_URL = "https://partner.example.com";
    const footer = listEcosystemFooterSurfaces({
      locale: "vi",
      marketingPath: (path) => path,
    });
    expect(footer.map((s) => s.id)).toEqual(["account", "partner", "download"]);
    expect(statusPublicUrl()).toBeNull();
  });

  it("includes status in nav when STATUS_URL is set", () => {
    process.env.ACCOUNT_URL = "https://account.example.com";
    process.env.STATUS_URL = "https://status.example.com";
    const nav = listEcosystemNavSurfaces({
      locale: "en",
      marketingPath: (path) => `/en${path}`,
    });
    expect(nav.some((s) => s.id === "status")).toBe(true);
    expect(nav.find((s) => s.id === "marketing")?.url).toBe("/en/products");
  });

  it("never exposes admin in public nav", () => {
    process.env.ADMIN_URL = "https://admin.example.com";
    process.env.ACCOUNT_URL = "https://account.example.com";
    const nav = listEcosystemNavSurfaces({
      locale: "vi",
      marketingPath: (path) => path,
    });
    expect(nav.some((s) => s.id === "admin")).toBe(false);
  });

  it("resolves marketing URL from WEB_URL", () => {
    process.env.WEB_URL = "https://www.example.com";
    expect(marketingPublicUrl()).toBe("https://www.example.com");
  });

  it("resolves account auth URLs from ACCOUNT_URL", () => {
    process.env.ACCOUNT_URL = "https://account.example.com";
    expect(accountSignInUrl()).toBe("https://account.example.com/sign-in");
    expect(accountSignUpUrl()).toBe("https://account.example.com/sign-up");
  });
});
