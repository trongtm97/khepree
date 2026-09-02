import { createHash } from "node:crypto";
import { isCatalogError } from "@khepree/catalog";
import { isCommerceError } from "@khepree/commerce";
import { isDesktopAuthError } from "@khepree/desktop-auth";
import { isLicensingError } from "@khepree/licensing";
import { jsonError } from "./api-response";

export function desktopAuthStatus(code: string): number {
  switch (code) {
    case "AUTH_CODE_INVALID":
    case "AUTH_CODE_EXPIRED":
    case "PKCE_INVALID":
    case "AUTH_REQUIRED":
    case "SESSION_EXPIRED":
    case "SESSION_REVOKED":
    case "REFRESH_TOKEN_INVALID":
    case "REFRESH_TOKEN_REUSED":
    case "DEVICE_PROOF_INVALID":
    case "DEVICE_REPLAY_DETECTED":
      return 401;
    case "REDIRECT_URI_INVALID":
      return 400;
    case "CLIENT_INACTIVE":
    case "DEVICE_BLOCKED":
    case "DEVICE_REMOVED":
    case "ENTITLEMENT_MISSING":
    case "ENTITLEMENT_EXPIRED":
    case "ENTITLEMENT_SUSPENDED":
    case "LICENSE_REVOKED":
    case "PRODUCT_NOT_ALLOWED":
      return 403;
    case "DEVICE_LIMIT_REACHED":
    case "DEVICE_TRANSFER_COOLDOWN":
    case "DEVICE_TRANSFER_LIMIT_REACHED":
    case "CHECKOUT_NOT_AVAILABLE":
    case "NOT_PURCHASABLE":
      return 409;
    case "RATE_LIMITED":
      return 429;
    default:
      return 400;
  }
}

export function desktopActivateErrorResponse(error: unknown, requestId: string): Response {
  if (isDesktopAuthError(error)) {
    return jsonError(error.code, error.message, desktopAuthStatus(error.code), requestId);
  }
  if (isCatalogError(error)) {
    if (error.code === "NOT_FOUND") {
      const message = error.message.toLowerCase();
      const code = message.includes("artifact")
        ? "ARTIFACT_NOT_FOUND"
        : message.includes("release")
          ? "RELEASE_NOT_FOUND"
          : "ANNOUNCEMENT_NOT_FOUND";
      return jsonError(code, error.message, 404, requestId);
    }
    if (error.code === "FORBIDDEN") {
      return jsonError("DOWNLOAD_NOT_AUTHORIZED", error.message, 403, requestId);
    }
    if (error.code === "CONFLICT") {
      return jsonError("DOWNLOAD_TICKET_REPLAY", error.message, 409, requestId);
    }
    const status = error.code === "INVALID_INPUT" ? 400 : 400;
    return jsonError(error.code, error.message, status, requestId);
  }
  if (isLicensingError(error)) {
    const code = mapLicensingToDesktopCode(error.code);
    return jsonError(
      code,
      error.message,
      desktopAuthStatus(code),
      requestId,
      error.details,
    );
  }
  if (isCommerceError(error)) {
    const code = error.code === "NOT_PURCHASABLE" ? "CHECKOUT_NOT_AVAILABLE" : error.code;
    return jsonError(code, error.message, desktopAuthStatus(code), requestId);
  }
  return jsonError("INTERNAL", "Request failed", 500, requestId);
}

function mapLicensingToDesktopCode(code: string): string {
  if (code === "NO_ACTIVE_ENTITLEMENT") return "ENTITLEMENT_MISSING";
  return code;
}

export function desktopAuthErrorResponse(error: unknown, requestId: string): Response {
  return desktopActivateErrorResponse(error, requestId);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** SHA-256 of canonical desktop signed payload (request fields excluding deviceProof). */
export function desktopDeviceProofBodySha256(payload: Record<string, string>): string {
  return sha256Hex(JSON.stringify(payload));
}

export function readDesktopDeviceProof(body: Record<string, unknown>) {
  const proof = (body.deviceProof ?? {}) as Record<string, unknown>;
  return {
    timestamp: typeof proof.timestamp === "number" ? proof.timestamp : Number(proof.timestamp ?? 0),
    nonce: typeof proof.nonce === "string" ? proof.nonce : "",
    signature: typeof proof.signature === "string" ? proof.signature : "",
    method: typeof proof.method === "string" ? proof.method : "",
    path: typeof proof.path === "string" ? proof.path : "",
    bodySha256: typeof proof.bodySha256 === "string" ? proof.bodySha256 : "",
  };
}

export function readDesktopRefreshBody(body: Record<string, unknown>) {
  return {
    sessionPublicId: typeof body.sessionPublicId === "string" ? body.sessionPublicId : "",
    refreshToken: typeof body.refreshToken === "string" ? body.refreshToken : "",
    deviceProof: readDesktopDeviceProof(body),
  };
}

export function readDesktopHeartbeatBody(body: Record<string, unknown>) {
  return {
    sessionPublicId: typeof body.sessionPublicId === "string" ? body.sessionPublicId : "",
    accessToken: typeof body.accessToken === "string" ? body.accessToken : "",
    deviceProof: readDesktopDeviceProof(body),
  };
}

export function readDesktopAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length >= 16 ? token : null;
}

export function readDesktopActivateBody(body: Record<string, unknown>) {
  return {
    clientId: typeof body.clientId === "string" ? body.clientId : "",
    installationId: typeof body.installationId === "string" ? body.installationId : "",
    devicePublicKey: typeof body.devicePublicKey === "string" ? body.devicePublicKey : undefined,
    platform: typeof body.platform === "string" ? body.platform : undefined,
    deviceName: typeof body.deviceName === "string" ? body.deviceName : undefined,
    appVersion: typeof body.appVersion === "string" ? body.appVersion : undefined,
  };
}

export function readDesktopCheckoutBody(body: Record<string, unknown>) {
  return {
    clientId: typeof body.clientId === "string" ? body.clientId : "",
    planPublicId: typeof body.planPublicId === "string" ? body.planPublicId : "",
    pricePublicId: typeof body.pricePublicId === "string" ? body.pricePublicId : "",
    locale: typeof body.locale === "string" ? body.locale : undefined,
  };
}

export function readDesktopExchangeBody(body: Record<string, unknown>) {
  return {
    clientId: typeof body.clientId === "string" ? body.clientId : "",
    code: typeof body.code === "string" ? body.code : "",
    redirectUri: typeof body.redirectUri === "string" ? body.redirectUri : "",
    codeVerifier: typeof body.codeVerifier === "string" ? body.codeVerifier : "",
    devicePublicKey: typeof body.devicePublicKey === "string" ? body.devicePublicKey : "",
    installationId: typeof body.installationId === "string" ? body.installationId : "",
    platform: typeof body.platform === "string" ? body.platform : undefined,
    deviceName: typeof body.deviceName === "string" ? body.deviceName : undefined,
    appVersion: typeof body.appVersion === "string" ? body.appVersion : undefined,
  };
}
