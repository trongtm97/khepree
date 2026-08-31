import { createHash } from "node:crypto";
import { DESKTOP_PKCE_METHOD } from "@khepree/config";

export function createPkceChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
}

export function verifyPkceS256(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method !== DESKTOP_PKCE_METHOD) return false;
  return createPkceChallenge(codeVerifier) === codeChallenge;
}
