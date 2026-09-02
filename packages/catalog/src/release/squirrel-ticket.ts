import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ReleaseArchitecture, ReleaseChannel } from "@khepree/db";
import { squirrelUpdateTicketSecret } from "@khepree/config";
import { CatalogError } from "../product/admin";

export type SquirrelTicketKind = "feed" | "artifact";

export interface SquirrelTicketPayload {
  v: 1;
  kind: SquirrelTicketKind;
  productId: string;
  channel: ReleaseChannel;
  architecture: ReleaseArchitecture;
  releasePublicId?: string;
  artifactPublicId?: string;
  sessionPublicId?: string;
  exp: number;
  jti: string;
}

function encodePayload(payload: SquirrelTicketPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): SquirrelTicketPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SquirrelTicketPayload;
    if (parsed.v !== 1 || !parsed.jti || !parsed.productId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function signEncodedPayload(encoded: string, secret: string): string {
  return createHmac("sha256", secret).update(encoded, "utf8").digest("base64url");
}

export function mintSquirrelTicket(
  payload: Omit<SquirrelTicketPayload, "v" | "jti"> & { jti?: string },
  secret = squirrelUpdateTicketSecret(),
): string {
  if (!secret) {
    throw new CatalogError("NOT_CONFIGURED", "Squirrel update ticket secret is not configured");
  }
  const body: SquirrelTicketPayload = {
    v: 1,
    jti: payload.jti ?? randomBytes(12).toString("base64url"),
    ...payload,
  };
  const encoded = encodePayload(body);
  return `${encoded}.${signEncodedPayload(encoded, secret)}`;
}

export function verifySquirrelTicket(
  token: string,
  expected: {
    kind: SquirrelTicketKind;
    productId?: string;
    channel?: ReleaseChannel;
    architecture?: ReleaseArchitecture;
    releasePublicId?: string;
    artifactPublicId?: string;
    sessionPublicId?: string;
  },
  secret = squirrelUpdateTicketSecret(),
): SquirrelTicketPayload {
  if (!secret) {
    throw new CatalogError("NOT_CONFIGURED", "Squirrel update ticket secret is not configured");
  }

  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) {
    throw new CatalogError("INVALID_INPUT", "Invalid update ticket");
  }

  const encoded = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expectedSig = signEncodedPayload(encoded, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new CatalogError("INVALID_INPUT", "Invalid update ticket signature");
  }

  const payload = decodePayload(encoded);
  if (!payload || payload.kind !== expected.kind) {
    throw new CatalogError("INVALID_INPUT", "Invalid update ticket payload");
  }
  if (payload.exp * 1000 <= Date.now()) {
    throw new CatalogError("INVALID_INPUT", "Update ticket expired");
  }
  if (expected.productId && payload.productId !== expected.productId) {
    throw new CatalogError("INVALID_INPUT", "Update ticket product scope mismatch");
  }
  if (expected.channel && payload.channel !== expected.channel) {
    throw new CatalogError("INVALID_INPUT", "Update ticket channel scope mismatch");
  }
  if (expected.architecture && payload.architecture !== expected.architecture) {
    throw new CatalogError("INVALID_INPUT", "Update ticket architecture scope mismatch");
  }
  if (expected.releasePublicId && payload.releasePublicId !== expected.releasePublicId) {
    throw new CatalogError("INVALID_INPUT", "Update ticket release scope mismatch");
  }
  if (expected.artifactPublicId && payload.artifactPublicId !== expected.artifactPublicId) {
    throw new CatalogError("INVALID_INPUT", "Update ticket artifact scope mismatch");
  }
  if (expected.sessionPublicId && payload.sessionPublicId !== expected.sessionPublicId) {
    throw new CatalogError("INVALID_INPUT", "Update ticket session scope mismatch");
  }

  return payload;
}

/** Log-safe ticket reference — never log the full opaque token. */
export function squirrelTicketLogRef(token: string): string {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return "invalid";
  const payload = decodePayload(trimmed.slice(0, dot));
  return payload?.jti ?? "unknown";
}
