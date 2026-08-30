import { afterEach, describe, expect, it } from "vitest";
import {
  getBillingContactEmail,
  getPartnerContact,
  getPrivacyContactEmail,
  getPublicContactAddresses,
  getSecurityReportEmail,
} from "./public-contact";

afterEach(() => {
  delete process.env.PUBLIC_CONTACT_BILLING;
  delete process.env.PUBLIC_CONTACT_SECURITY;
  delete process.env.PUBLIC_CONTACT_HELLO;
  delete process.env.PUBLIC_CONTACT_PRIVACY;
  delete process.env.MAIL_REPLY_TO;
  delete process.env.PARTNER_URL;
});

describe("public-contact", () => {
  it("defaults hello and support addresses", () => {
    expect(getPublicContactAddresses()).toEqual({
      hello: "hello@khepree.com",
      support: "support@khepree.com",
      billing: null,
      security: null,
    });
  });

  it("defaults security report email", () => {
    expect(getSecurityReportEmail()).toBe("security@khepree.com");
    process.env.PUBLIC_CONTACT_SECURITY = "sec@example.com";
    expect(getSecurityReportEmail()).toBe("sec@example.com");
  });

  it("falls back privacy and billing contacts to support", () => {
    expect(getPrivacyContactEmail()).toBe("support@khepree.com");
    expect(getBillingContactEmail()).toBe("support@khepree.com");
    process.env.PUBLIC_CONTACT_PRIVACY = "privacy@khepree.com";
    process.env.PUBLIC_CONTACT_BILLING = "billing@khepree.com";
    expect(getPrivacyContactEmail()).toBe("privacy@khepree.com");
    expect(getBillingContactEmail()).toBe("billing@khepree.com");
  });

  it("shows billing and security contact cards only when configured", () => {
    process.env.PUBLIC_CONTACT_BILLING = "billing@khepree.com";
    process.env.PUBLIC_CONTACT_SECURITY = "security@khepree.com";
    const addresses = getPublicContactAddresses();
    expect(addresses.billing).toBe("billing@khepree.com");
    expect(addresses.security).toBe("security@khepree.com");
  });

  it("prefers partner portal URL on public hosts", () => {
    process.env.PARTNER_URL = "https://partner.khepree.com";
    expect(getPartnerContact().kind).toBe("url");
  });

  it("falls back to hello email for local partner URL", () => {
    process.env.PARTNER_URL = "http://localhost:3003";
    const contact = getPartnerContact();
    expect(contact.kind).toBe("email");
    if (contact.kind === "email") expect(contact.address).toBe("hello@khepree.com");
  });
});
