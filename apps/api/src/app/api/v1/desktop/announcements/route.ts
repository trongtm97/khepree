import { createAnnouncementService } from "@khepree/catalog";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import {
  desktopAnnouncementsQueryErrorMessage,
  parseDesktopAnnouncementsQuery,
  serializeDesktopAnnouncementsPage,
} from "@/lib/desktop-announcements";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_ANNOUNCEMENTS, "announcements");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const url = new URL(request.url);
  const parsed = parseDesktopAnnouncementsQuery(url.searchParams);
  if (typeof parsed === "string") {
    return jsonError("INVALID_INPUT", desktopAnnouncementsQueryErrorMessage(parsed), 400, requestId);
  }

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, parsed.clientId);

    const announcementService = createAnnouncementService();
    const page = await announcementService.listForDesktop({
      userId: session.userId,
      productId: client.productId,
      appVersion: parsed.appVersion,
      platform: parsed.platform,
      architecture: parsed.architecture,
      channel: parsed.channel,
      locale: parsed.locale,
      limit: parsed.limit,
      cursor: parsed.cursor,
    });

    return jsonOk(serializeDesktopAnnouncementsPage(page), requestId);
  } catch (error) {
    return desktopActivateErrorResponse(error, requestId);
  }
}
