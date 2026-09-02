import { DOMAINS } from "./domains";

const KHEPREE_ROOT = DOMAINS.web;

const REL_TOKEN_ORDER = ["ugc", "sponsored", "nofollow", "noopener", "noreferrer"] as const;

export const THIRD_PARTY_LINK_REL = "nofollow noopener noreferrer";
export const NEW_TAB_LINK_REL = "noopener noreferrer";

/** Host is khepree.com, www.khepree.com, or any *.khepree.com subdomain. */
export function isKhepreeFirstPartyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === KHEPREE_ROOT || host === `www.${KHEPREE_ROOT}`) return true;
  if (host.endsWith(`.${KHEPREE_ROOT}`)) return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return false;
}

export function isHttpHttpsUrl(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

export function isInternalPath(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("#")) return true;
  return false;
}

export function isProtocolLink(href: string): boolean {
  const trimmed = href.trim();
  return /^(mailto:|tel:)/i.test(trimmed);
}

/** Third-party HTTP(S) URL — not relative, not mailto/tel, not Khepree first-party. */
export function isThirdPartyHttpUrl(href: string): boolean {
  if (!isHttpHttpsUrl(href)) return false;
  try {
    const { hostname } = new URL(href);
    return !isKhepreeFirstPartyHost(hostname);
  } catch {
    return false;
  }
}

/** Merge rel tokens without duplicates; required tokens always preserved when present in base. */
export function mergeRelTokens(base: string, extra?: string): string {
  const tokens = new Set<string>();
  for (const part of [base, extra]) {
    if (!part) continue;
    for (const token of part.split(/\s+/)) {
      if (token) tokens.add(token.toLowerCase());
    }
  }
  const ordered = REL_TOKEN_ORDER.filter((token) => tokens.has(token));
  const rest = [...tokens].filter((token) => !REL_TOKEN_ORDER.includes(token as (typeof REL_TOKEN_ORDER)[number])).sort();
  return [...rest, ...ordered].join(" ");
}

export interface OutboundLinkAttributes {
  target?: "_blank";
  rel?: string;
}

export interface OutboundLinkOptions {
  /** Open first-party absolute URLs in a new tab (ecosystem surfaces, account links). */
  forceNewTab?: boolean;
  rel?: string;
}

/**
 * Outbound link policy for anchors:
 * - third-party http(s): target=_blank, rel=nofollow noopener noreferrer
 * - first-party http(s) + forceNewTab: target=_blank, rel=noopener noreferrer (no nofollow)
 * - relative / mailto / tel: no automatic attributes
 */
export function getOutboundLinkAttributes(
  href: string,
  options: OutboundLinkOptions = {},
): OutboundLinkAttributes {
  const trimmed = href.trim();
  if (!trimmed || isInternalPath(trimmed) || isProtocolLink(trimmed)) return {};

  if (isThirdPartyHttpUrl(trimmed)) {
    return {
      target: "_blank",
      rel: mergeRelTokens(THIRD_PARTY_LINK_REL, options.rel),
    };
  }

  if (isHttpHttpsUrl(trimmed) && options.forceNewTab) {
    return {
      target: "_blank",
      rel: mergeRelTokens(NEW_TAB_LINK_REL, options.rel),
    };
  }

  return {};
}
