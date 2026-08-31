import { isDesktopAuthError } from "@khepree/desktop-auth";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { desktopActivateErrorResponse, readDesktopAccessToken } from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_LOGOUT, "logout");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  try {
    await getPlatform().desktopAuth.logout({ accessToken }, { ipAddress: clientIp(request) });
    return jsonOk({ ok: true }, requestId);
  } catch (error) {
    if (isDesktopAuthError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop logout failed", 500, requestId);
  }
}
