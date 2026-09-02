import {
  isHttpHttpsUrl,
  isInternalPath,
  isKhepreeFirstPartyHost,
  isProtocolLink,
} from "@khepree/config";
import type { AnnouncementCtaKind } from "@khepree/db";
import { isSafeRedirectPath } from "../content/redirect-path";

const BLOCKED_URL_SCHEMES = /^(javascript|file|data|vbscript):/i;
const SHELL_METACHAR = /[;|`$]|&&|\|\||\$\(/;

export interface OpenUrlCtaPayload {
  url: string;
}

export interface OpenPathCtaPayload {
  path: string;
}

export type ValidatedCtaPayload = OpenUrlCtaPayload | OpenPathCtaPayload | null;

export function isAllowedAnnouncementUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || BLOCKED_URL_SCHEMES.test(trimmed)) return false;
  if (SHELL_METACHAR.test(trimmed)) return false;
  if (isInternalPath(trimmed)) return isSafeRedirectPath(trimmed);
  if (isProtocolLink(trimmed)) return false;
  if (!isHttpHttpsUrl(trimmed)) return false;
  try {
    return isKhepreeFirstPartyHost(new URL(trimmed).hostname);
  } catch {
    return false;
  }
}

export function validateAnnouncementCta(
  kind: AnnouncementCtaKind,
  payload: unknown,
): ValidatedCtaPayload {
  if (kind === "none") {
    if (payload != null && Object.keys(payload as object).length > 0) {
      throw new Error("CTA none must not include payload");
    }
    return null;
  }

  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("CTA payload must be an object");
  }

  if (kind === "open_url") {
    const url = (payload as OpenUrlCtaPayload).url;
    if (typeof url !== "string" || !url.trim()) {
      throw new Error("CTA open_url requires url");
    }
    if (!isAllowedAnnouncementUrl(url)) {
      throw new Error("CTA url is not allowlisted");
    }
    return { url: url.trim() };
  }

  if (kind === "open_path") {
    const path = (payload as OpenPathCtaPayload).path;
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("CTA open_path requires path");
    }
    if (!isSafeRedirectPath(path)) {
      throw new Error("CTA path is not a safe internal path");
    }
    if (SHELL_METACHAR.test(path)) {
      throw new Error("CTA path contains disallowed characters");
    }
    return { path: path.trim() };
  }

  throw new Error(`Unsupported CTA kind: ${kind}`);
}
