import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { readDesktopAccessToken, desktopActivateErrorResponse } from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";
import { campaignSyncPayloadSchema } from "@/lib/campaign-sync-schema";
import {
  isCampaignSyncError,
  upsertCampaignSync,
} from "@/lib/campaign-sync";
import { getDb } from "@khepree/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_CAMPAIGN_SYNC, "campaign-sync");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_INPUT", "Request body must be valid JSON", 400, requestId);
  }

  const parsed = campaignSyncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "INVALID_INPUT",
      parsed.error.errors[0]?.message ?? "Invalid payload",
      400,
      requestId,
    );
  }

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);

    // Resolve entitlement feature entries for capability gate
    const entitlementRows = await platform.entitlement.resolveEntitlementsForPrincipal({
      type: "USER",
      id: session.userId,
    });
    const entitlementRow = entitlementRows.find(
      (row) => row.entitlement.productId === client.productId,
    );
    const featureEntries = entitlementRow?.entitlement.featureSnapshot.entries ?? [];

    const result = await upsertCampaignSync(
      {
        userId: session.userId,
        productId: client.productId,
        payload: parsed.data,
        featureEntries,
      },
      getDb()!,
    );

    return jsonOk(result, requestId);
  } catch (error) {
    if (isCampaignSyncError(error)) {
      const status = error.code === "CAPABILITY_DISABLED" ? 403 : 400;
      return jsonError(error.code, error.message, status, requestId);
    }
    return desktopActivateErrorResponse(error, requestId);
  }
}
