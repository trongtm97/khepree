export type OfficialContactChannel = "facebook" | "youtube" | "tiktok" | "telegram" | "zalo";

export interface OfficialContactLink {
  id: OfficialContactChannel;
  href: string;
  /** Platform brand name — not localized (Facebook, YouTube, …). */
  platformLabel: string;
  handle?: string;
  displayValue?: string;
}

const OFFICIAL_CONTACT_LINKS: readonly OfficialContactLink[] = [
  {
    id: "facebook",
    platformLabel: "Facebook",
    href: "https://www.facebook.com/KhepreeLabs",
    handle: "Khepree Labs",
  },
  {
    id: "youtube",
    platformLabel: "YouTube",
    href: "https://www.youtube.com/@KhepreeLabs",
    handle: "KhepreeLabs",
  },
  {
    id: "tiktok",
    platformLabel: "TikTok",
    href: "https://www.tiktok.com/@khepreelabs",
    handle: "khepreelabs",
  },
  {
    id: "telegram",
    platformLabel: "Telegram",
    href: "https://t.me/KhepreeLabs",
    handle: "KhepreeLabs",
  },
  {
    id: "zalo",
    platformLabel: "Zalo",
    href: "https://zalo.me/0867268149",
    displayValue: "0867.268.149",
  },
] as const;

/** Canonical official Khepree/Khepree Labs contact channels. */
export function getOfficialContactLinks(): OfficialContactLink[] {
  return OFFICIAL_CONTACT_LINKS.map((link) => ({ ...link }));
}

/** Social profile URLs for Organization `sameAs` — excludes Zalo chat entry point. */
export function getOfficialSocialSameAsUrls(): string[] {
  return OFFICIAL_CONTACT_LINKS.filter((link) => link.id !== "zalo").map((link) => link.href);
}

/** E.164 telephone for structured data — display format differs in UI. */
export const OFFICIAL_CONTACT_TELEPHONE_E164 = "+84867268149";
