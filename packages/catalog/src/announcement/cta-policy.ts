import {
  isHttpHttpsUrl,
  isInternalPath,
  isKhepreeFirstPartyHost,
  isProtocolLink,
} from "@khepree/config";
import { isPublicId, type AnnouncementCtaKind } from "@khepree/db";
import { isSafeRedirectPath } from "../content/redirect-path";

const BLOCKED_URL_SCHEMES = /^(javascript|file|data|vbscript):/i;
const SHELL_METACHAR = /[;|`$]|&&|\|\||\$\(/;

export const SOFTWARE_UPDATE_ACTIONS = ["download", "auto_update"] as const;
export type SoftwareUpdateAction = (typeof SOFTWARE_UPDATE_ACTIONS)[number];

export interface OpenUrlCtaPayload {
  url: string;
}

export interface OpenPathCtaPayload {
  path: string;
}

export interface SoftwareUpdateCtaPayload {
  releasePublicId: string;
  actions: SoftwareUpdateAction[];
}

export type ValidatedCtaPayload =
  | OpenUrlCtaPayload
  | OpenPathCtaPayload
  | SoftwareUpdateCtaPayload
  | null;

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

function parseSoftwareUpdateActions(raw: unknown): SoftwareUpdateAction[] {
  if (raw == null) return [...SOFTWARE_UPDATE_ACTIONS];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("CTA software_update actions must be a non-empty array");
  }
  const allowed = new Set<string>(SOFTWARE_UPDATE_ACTIONS);
  const actions: SoftwareUpdateAction[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !allowed.has(item)) {
      throw new Error("CTA software_update actions must be download and/or auto_update");
    }
    if (!actions.includes(item as SoftwareUpdateAction)) {
      actions.push(item as SoftwareUpdateAction);
    }
  }
  return actions;
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

  if (kind === "software_update") {
    const releasePublicId = (payload as SoftwareUpdateCtaPayload).releasePublicId;
    if (typeof releasePublicId !== "string" || !releasePublicId.trim()) {
      throw new Error("CTA software_update requires releasePublicId");
    }
    const trimmed = releasePublicId.trim();
    if (!isPublicId(trimmed, "rel")) {
      throw new Error("CTA software_update releasePublicId is invalid");
    }
    return {
      releasePublicId: trimmed,
      actions: parseSoftwareUpdateActions((payload as SoftwareUpdateCtaPayload).actions),
    };
  }

  throw new Error(`Unsupported CTA kind: ${kind}`);
}
