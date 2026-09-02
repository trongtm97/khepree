import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { getDownloadService } from "@/lib/catalog-services";
import {
  assertReleaseMatchesClientProduct,
  buildReleaseDownloadContext,
  desktopUpdateDownloadBodyErrorMessage,
  parseDesktopUpdateDownloadBody,
  resolveDesktopUpdateAccess,
} from "@/lib/desktop-updates";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_UPDATES, "updates-download");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseDesktopUpdateDownloadBody(body);
  if (typeof parsed === "string") {
    return jsonError("INVALID_INPUT", desktopUpdateDownloadBodyErrorMessage(parsed), 400, requestId);
  }

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, parsed.clientId);

    const access = await resolveDesktopUpdateAccess(platform, session, client.productId);
    if (!access.canAccessUpdates) {
      return jsonError("ENTITLEMENT_MISSING", "No active entitlement for this product", 403, requestId);
    }

    const authorized = await getDownloadService().authorizeReleaseArtifactDownload({
      releasePublicId: parsed.releasePublicId,
      artifactPublicId: parsed.artifactPublicId,
      context: buildReleaseDownloadContext({ access, actorUserId: session.userId }),
    });

    assertReleaseMatchesClientProduct(authorized.productId, client);

    return jsonOk(
      {
        ticketId: authorized.ticketId,
        downloadUrl: authorized.downloadUrl,
        expiresAt: authorized.expiresAt.toISOString(),
        artifactPublicId: authorized.artifactPublicId,
      },
      requestId,
    );
  } catch (error) {
    return desktopActivateErrorResponse(error, requestId);
  }
}
