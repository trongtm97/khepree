import { isDesktopAuthError } from "@khepree/desktop-auth";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { desktopAuthErrorResponse, readDesktopExchangeBody } from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_EXCHANGE, "exchange");
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = readDesktopExchangeBody(body);
  if (
    !input.clientId ||
    !input.code ||
    !input.redirectUri ||
    !input.codeVerifier ||
    !input.devicePublicKey ||
    !input.installationId
  ) {
    return jsonError(
      "AUTH_CODE_INVALID",
      "clientId, code, redirectUri, codeVerifier, devicePublicKey, and installationId are required",
      401,
      requestId,
    );
  }

  try {
    const result = await getPlatform().desktopAuth.exchangeAuthCode(input, {
      ipAddress: clientIp(request),
    });
    return jsonOk(
      {
        sessionPublicId: result.sessionPublicId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessExpiresAt: result.accessExpiresAt,
        refreshExpiresAt: result.refreshExpiresAt,
        devicePublicId: result.devicePublicId,
        user: result.user,
        client: result.client,
        entitlement: result.entitlement,
        entitlementAccess: result.entitlementAccess,
      },
      requestId,
    );
  } catch (error) {
    if (isDesktopAuthError(error)) {
      const failLimited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_EXCHANGE, "invalid-code");
      if (failLimited) return failLimited;
      return desktopAuthErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop auth exchange failed", 500, requestId);
  }
}
