import { isDesktopAuthError } from "@khepree/desktop-auth";
import { serializeDesktopLatestUpdate } from "@khepree/catalog";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { getReleaseService } from "@/lib/catalog-services";
import {
  desktopUpdatesQueryErrorMessage,
  parseDesktopUpdatesQuery,
  resolveDesktopUpdateAccess,
  serializeDesktopLatestUpdateResponse,
} from "@/lib/desktop-updates";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_UPDATES, "updates-latest");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const url = new URL(request.url);
  const parsed = parseDesktopUpdatesQuery(url.searchParams);
  if (typeof parsed === "string") {
    return jsonError("INVALID_INPUT", desktopUpdatesQueryErrorMessage(parsed), 400, requestId);
  }

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, parsed.clientId);

    const access = await resolveDesktopUpdateAccess(platform, session, client.productId);
    if (!access.canAccessUpdates) {
      return jsonError("ENTITLEMENT_MISSING", "No active entitlement for this product", 403, requestId);
    }

    const release = await getReleaseService().findLatestCompatible({
      productId: client.productId,
      platform: parsed.platform,
      architecture: parsed.architecture,
      channel: parsed.channel,
      currentVersion: parsed.currentVersion,
    });

    if (!release) {
      return jsonOk(serializeDesktopLatestUpdateResponse(null), requestId);
    }

    const update = serializeDesktopLatestUpdate(release, parsed.locale);
    return jsonOk(serializeDesktopLatestUpdateResponse(update), requestId);
  } catch (error) {
    return desktopActivateErrorResponse(error, requestId);
  }
}
