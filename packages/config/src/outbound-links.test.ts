import { describe, expect, it } from "vitest";
import {
  getOutboundLinkAttributes,
  isInternalPath,
  isKhepreeFirstPartyHost,
  isProtocolLink,
  isThirdPartyHttpUrl,
  mergeRelTokens,
  NEW_TAB_LINK_REL,
  THIRD_PARTY_LINK_REL,
} from "./outbound-links";

describe("isKhepreeFirstPartyHost", () => {
  it("recognizes production Khepree hosts", () => {
    expect(isKhepreeFirstPartyHost("khepree.com")).toBe(true);
    expect(isKhepreeFirstPartyHost("www.khepree.com")).toBe(true);
    expect(isKhepreeFirstPartyHost("account.khepree.com")).toBe(true);
    expect(isKhepreeFirstPartyHost("partner.khepree.com")).toBe(true);
  });

  it("rejects third-party hosts", () => {
    expect(isKhepreeFirstPartyHost("facebook.com")).toBe(false);
    expect(isKhepreeFirstPartyHost("notkhepree.com")).toBe(false);
  });
});

describe("isThirdPartyHttpUrl", () => {
  it("classifies external social and contact URLs", () => {
    expect(isThirdPartyHttpUrl("https://facebook.com/KhepreeLabs")).toBe(true);
    expect(isThirdPartyHttpUrl("https://www.youtube.com/@KhepreeLabs")).toBe(true);
    expect(isThirdPartyHttpUrl("https://t.me/KhepreeLabs")).toBe(true);
    expect(isThirdPartyHttpUrl("https://zalo.me/0867268149")).toBe(true);
  });

  it("classifies Khepree first-party absolute URLs as internal", () => {
    expect(isThirdPartyHttpUrl("https://khepree.com")).toBe(false);
    expect(isThirdPartyHttpUrl("https://www.khepree.com/vi/products")).toBe(false);
    expect(isThirdPartyHttpUrl("https://account.khepree.com")).toBe(false);
    expect(isThirdPartyHttpUrl("https://partner.khepree.com")).toBe(false);
  });
});

describe("isInternalPath", () => {
  it("recognizes relative and hash links", () => {
    expect(isInternalPath("/vi/products")).toBe(true);
    expect(isInternalPath("/contact")).toBe(true);
    expect(isInternalPath("#pricing")).toBe(true);
  });
});

describe("isProtocolLink", () => {
  it("recognizes mailto and tel", () => {
    expect(isProtocolLink("mailto:support@khepree.com")).toBe(true);
    expect(isProtocolLink("tel:+84867268149")).toBe(true);
  });
});

describe("mergeRelTokens", () => {
  it("merges caller rel without dropping required tokens", () => {
    expect(mergeRelTokens(THIRD_PARTY_LINK_REL, "ugc")).toBe("ugc nofollow noopener noreferrer");
  });
});

describe("getOutboundLinkAttributes", () => {
  it("applies third-party policy with nofollow", () => {
    const attrs = getOutboundLinkAttributes("https://www.facebook.com/KhepreeLabs");
    expect(attrs.target).toBe("_blank");
    expect(attrs.rel).toContain("nofollow");
    expect(attrs.rel).toContain("noopener");
    expect(attrs.rel).toContain("noreferrer");
  });

  it("opens first-party URLs in new tab without nofollow when forced", () => {
    const attrs = getOutboundLinkAttributes("https://account.khepree.com", { forceNewTab: true });
    expect(attrs.target).toBe("_blank");
    expect(attrs.rel).toBe(NEW_TAB_LINK_REL);
    expect(attrs.rel).not.toContain("nofollow");
  });

  it("leaves relative paths untouched", () => {
    expect(getOutboundLinkAttributes("/vi/products")).toEqual({});
  });

  it("leaves mailto untouched", () => {
    expect(getOutboundLinkAttributes("mailto:support@khepree.com")).toEqual({});
  });
});
