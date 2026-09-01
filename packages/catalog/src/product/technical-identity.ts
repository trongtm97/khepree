import type { AccessTermKind } from "./studio-field-policy";
import { suggestProductSlug } from "./slug";

const PRODUCT_CODE_PREFIX = "KHEPREE_";
const PROTOCOL_PATTERN = /^[a-z][a-z0-9]{2,63}$/;
const PRODUCT_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,80}$/;
const DESKTOP_CLIENT_ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const CALLBACK_PATH = "auth/callback";

/** Uppercase snake product code — stable internal identifier, not display text. */
export function suggestProductCode(name: string): string {
  const words = normalizeWords(name).filter((w) => w !== "KHEPREE");
  const body = words.length ? words.join("_") : "PRODUCT";
  const code = `${PRODUCT_CODE_PREFIX}${body}`.replace(/_+/g, "_").slice(0, 80);
  return code.endsWith("_") ? code.slice(0, -1) : code;
}

/** Base access feature key, e.g. novel_ai.access */
export function suggestAccessFeatureKey(name: string): string {
  const words = normalizeWords(name).filter((w) => w !== "KHEPREE");
  const base = (words.length ? words : ["product"]).join("_").toLowerCase();
  return `${base}.access`;
}

/** Public desktop OAuth client id, e.g. khepree.novel-ai.desktop */
export function suggestDesktopClientId(name: string): string {
  const slug = suggestProductSlug(name);
  const suffix = slug.startsWith("khepree-") ? slug.slice("khepree-".length) : slug;
  return suffix ? `khepree.${suffix}.desktop` : `khepree.${slug}.desktop`;
}

/** Custom URL scheme — lowercase alphanumeric only. */
export function suggestDesktopProtocol(name: string): string {
  const raw = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return raw.slice(0, 64) || "khepreeapp";
}

export function deriveDesktopCallbackUri(protocol: string): string {
  const safe = protocol.trim().toLowerCase();
  return `${safe}://${CALLBACK_PATH}`;
}

export function validateDesktopProtocol(protocol: string): boolean {
  return PROTOCOL_PATTERN.test(protocol.trim().toLowerCase());
}

export function validateProductCode(code: string): boolean {
  return PRODUCT_CODE_PATTERN.test(code.trim());
}

export function validateDesktopClientId(clientId: string): boolean {
  return DESKTOP_CLIENT_ID_PATTERN.test(clientId.trim());
}

export function validateCallbackUri(protocol: string, callbackUri: string): boolean {
  const expected = deriveDesktopCallbackUri(protocol);
  return callbackUri.trim() === expected;
}

/** Plan internal code — unique per product, not used for authorization. */
export function suggestInternalPlanCode(
  productCode: string,
  termKind: AccessTermKind,
  planName?: string,
): string {
  const base = productCode.replace(/^KHEPREE_/, "") || "PRODUCT";
  const normalizedName = normalizeWords(planName ?? "").join("_");
  switch (termKind) {
    case "trial":
      return `${base}_FREE_TRIAL`;
    case "month":
      return `${base}_MONTHLY`;
    case "year":
      return `${base}_YEARLY`;
    case "lifetime":
      return `${base}_LIFETIME`;
    case "day":
      return normalizedName ? `${base}_${normalizedName}` : `${base}_DAY`;
    default:
      return `${base}_${normalizedName || "PLAN"}`;
  }
}

export interface DerivedTechnicalIdentity {
  slug: string;
  productCode: string;
  accessFeatureKey: string;
  desktopClientId: string | null;
  desktopProtocol: string | null;
  desktopCallbackUri: string | null;
}

export function deriveTechnicalIdentity(input: {
  name: string;
  productType: string | null;
  slug?: string | null;
  productCode?: string | null;
}): DerivedTechnicalIdentity {
  const slug = input.slug?.trim() || suggestProductSlug(input.name);
  const productCode = input.productCode?.trim() || suggestProductCode(input.name);
  const accessFeatureKey = suggestAccessFeatureKey(input.name);
  const isDesktop = input.productType === "desktop-software";
  const desktopProtocol = isDesktop ? suggestDesktopProtocol(input.name) : null;
  return {
    slug,
    productCode,
    accessFeatureKey,
    desktopClientId: isDesktop ? suggestDesktopClientId(input.name) : null,
    desktopProtocol,
    desktopCallbackUri: desktopProtocol ? deriveDesktopCallbackUri(desktopProtocol) : null,
  };
}

export function parseProductCode(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.productCode;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function parseAccessFeatureKey(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.accessFeatureKey;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function parseDesktopProtocol(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.desktopProtocol;
  return typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : null;
}

function normalizeWords(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
