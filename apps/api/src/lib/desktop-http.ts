import { isDesktopAuthError } from "@khepree/desktop-auth";
import { jsonError } from "./api-response";

export function desktopAuthStatus(code: string): number {
  switch (code) {
    case "AUTH_CODE_INVALID":
    case "AUTH_CODE_EXPIRED":
    case "PKCE_INVALID":
    case "AUTH_REQUIRED":
      return 401;
    case "REDIRECT_URI_INVALID":
      return 400;
    case "CLIENT_INACTIVE":
    case "DEVICE_BLOCKED":
    case "DEVICE_REMOVED":
      return 403;
    case "DEVICE_LIMIT_REACHED":
    case "DEVICE_TRANSFER_COOLDOWN":
    case "DEVICE_TRANSFER_LIMIT_REACHED":
      return 409;
    case "RATE_LIMITED":
      return 429;
    default:
      return 400;
  }
}

export function desktopAuthErrorResponse(error: unknown, requestId: string): Response {
  if (isDesktopAuthError(error)) {
    return jsonError(error.code, error.message, desktopAuthStatus(error.code), requestId);
  }
  return jsonError("INTERNAL", "Request failed", 500, requestId);
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
