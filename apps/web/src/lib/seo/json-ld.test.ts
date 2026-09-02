import { getOfficialSocialSameAsUrls } from "@khepree/config";
import { describe, expect, it } from "vitest";
import { organizationJsonLd, websiteJsonLd } from "./json-ld";

describe("organizationJsonLd", () => {
  it("uses factual fields only", () => {
    const data = organizationJsonLd();
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBeTruthy();
    expect(data.url).toMatch(/^https?:\/\//);
    expect(data.logo).toMatch(/\/brand\/logo\.png$/);
    expect(Array.isArray(data.contactPoint)).toBe(true);
    expect(data).not.toHaveProperty("foundingDate");
    expect(data).not.toHaveProperty("numberOfEmployees");
    expect(data).not.toHaveProperty("description");
    expect(data.sameAs).toEqual(getOfficialSocialSameAsUrls());
  });
});

describe("websiteJsonLd", () => {
  it("describes the public site without fake fields", () => {
    const data = websiteJsonLd();
    expect(data["@type"]).toBe("WebSite");
    expect(data.name).toBeTruthy();
    expect(data.url).toMatch(/^https?:\/\//);
  });
});
