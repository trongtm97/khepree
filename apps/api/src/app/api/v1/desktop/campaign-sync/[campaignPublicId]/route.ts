import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { readDesktopAccessToken, desktopActivateErrorResponse } from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";
import { deleteCampaignSync } from "@/lib/campaign-sync";
import { getDb } from "@khepree/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ campaignPublicId: string }> },
) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_CAMPAIGN_SYNC, "campaign-sync-delete");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const { campaignPublicId } = await params;
  if (!campaignPublicId || campaignPublicId.length > 64) {
    return jsonError("INVALID_INPUT", "Invalid campaignPublicId", 400, requestId);
  }

  try {
    const platform = getPlatform();
    const { session } = await platform.desktopAuth.resolveAccessSession(accessToken);

    await deleteCampaignSync(
      { userId: session.userId, campaignPublicId },
      getDb()!,
    );

    return jsonOk({ deleted: true }, requestId);
  } catch (error) {
    return desktopActivateErrorResponse(error, requestId);
  }
}
