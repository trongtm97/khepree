import { partnerPublicUrl } from "./ecosystem-surfaces";

const DEFAULT_HELLO = "hello@khepree.com";
const DEFAULT_SUPPORT = "support@khepree.com";
const DEFAULT_SECURITY = "security@khepree.com";

function parseEmailAddress(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const angle = trimmed.match(/<([^>]+)>/);
  return (angle?.[1] ?? trimmed).trim() || undefined;
}

export interface PublicContactAddresses {
  hello: string;
  support: string;
  billing: string | null;
  security: string | null;
}

/** Public-facing contact mailboxes — optional billing/security only when env is set. */
export function getPublicContactAddresses(
  source: Record<string, string | undefined> = process.env,
): PublicContactAddresses {
  const replyTo = parseEmailAddress(source.MAIL_REPLY_TO);
  return {
    hello: source.PUBLIC_CONTACT_HELLO?.trim() || DEFAULT_HELLO,
    support: source.PUBLIC_CONTACT_SUPPORT?.trim() || replyTo || DEFAULT_SUPPORT,
    billing: source.PUBLIC_CONTACT_BILLING?.trim() || null,
    security: source.PUBLIC_CONTACT_SECURITY?.trim() || null,
  };
}

export type PartnerContact =
  | { kind: "url"; href: string; label: string }
  | { kind: "email"; address: string; label: string };

/** Security disclosure mailbox — always available for /security reporting copy. */
export function getSecurityReportEmail(
  source: Record<string, string | undefined> = process.env,
): string {
  return source.PUBLIC_CONTACT_SECURITY?.trim() || DEFAULT_SECURITY;
}

/** Privacy requests — env-configured mailbox only; otherwise support. */
export function getPrivacyContactEmail(
  source: Record<string, string | undefined> = process.env,
): string {
  const configured = source.PUBLIC_CONTACT_PRIVACY?.trim();
  if (configured) return configured;
  return getPublicContactAddresses(source).support;
}

/** Refund and billing — configured billing mailbox or support fallback. */
export function getBillingContactEmail(
  source: Record<string, string | undefined> = process.env,
): string {
  return getPublicContactAddresses(source).billing || getPublicContactAddresses(source).support;
}

/** Partner portal when configured on a public host; otherwise general hello mailbox. */
export function getPartnerContact(
  source: Record<string, string | undefined> = process.env,
): PartnerContact {
  const addresses = getPublicContactAddresses(source);
  const href = partnerPublicUrl(source);
  const isLocal = /localhost|127\.0\.0\.1/i.test(href);
  if (!isLocal) {
    return { kind: "url", href, label: href.replace(/^https?:\/\//, "") };
  }
  return { kind: "email", address: addresses.hello, label: addresses.hello };
}
