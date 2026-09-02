import { describe, expect, it } from "vitest";
import {
  getOfficialContactLinks,
  getOfficialSocialSameAsUrls,
  OFFICIAL_CONTACT_TELEPHONE_E164,
} from "./official-contact";

describe("official-contact", () => {
  it("contains exact canonical URLs and display values", () => {
    const links = getOfficialContactLinks();
    const byId = Object.fromEntries(links.map((link) => [link.id, link]));

    expect(byId.facebook).toMatchObject({
      platformLabel: "Facebook",
      href: "https://www.facebook.com/KhepreeLabs",
      handle: "Khepree Labs",
    });
    expect(byId.youtube).toMatchObject({
      platformLabel: "YouTube",
      href: "https://www.youtube.com/@KhepreeLabs",
      handle: "KhepreeLabs",
    });
    expect(byId.tiktok).toMatchObject({
      platformLabel: "TikTok",
      href: "https://www.tiktok.com/@khepreelabs",
      handle: "khepreelabs",
    });
    expect(byId.telegram).toMatchObject({
      platformLabel: "Telegram",
      href: "https://t.me/KhepreeLabs",
      handle: "KhepreeLabs",
    });
    expect(byId.zalo).toMatchObject({
      platformLabel: "Zalo",
      href: "https://zalo.me/0867268149",
      displayValue: "0867.268.149",
    });
  });

  it("exposes social sameAs without Zalo", () => {
    expect(getOfficialSocialSameAsUrls()).toEqual([
      "https://www.facebook.com/KhepreeLabs",
      "https://www.youtube.com/@KhepreeLabs",
      "https://www.tiktok.com/@khepreelabs",
      "https://t.me/KhepreeLabs",
    ]);
  });

  it("provides normalized telephone for structured data", () => {
    expect(OFFICIAL_CONTACT_TELEPHONE_E164).toBe("+84867268149");
  });
});
