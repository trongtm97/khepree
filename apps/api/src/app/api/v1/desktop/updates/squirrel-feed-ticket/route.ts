import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import {
  buildSquirrelFeedBaseUrl,
  mintSquirrelFeedTicket,
  parseSquirrelFeedTarget,
} from "@/lib/squirrel-feed";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";
import { resolveDesktopUpdateAccess } from "@/lib/desktop-updates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_UPDATES, "squirrel-feed-ticket");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const architecture = typeof body.architecture === "string" ? body.architecture.trim() : "x64";
  const channel = typeof body.channel === "string" ? body.channel.trim() : "stable";
  if (!clientId) {
    return jsonError("INVALID_INPUT", "clientId is required", 400, requestId);
  }

  const parsed = parseSquirrelFeedTarget({ architecture, channel });
  if (typeof parsed === "string") {
    return jsonError("INVALID_INPUT", `Invalid feed target: ${parsed}`, 400, requestId);
  }

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, clientId);

    const access = await resolveDesktopUpdateAccess(platform, session, client.productId);
    if (!access.canAccessUpdates) {
      return jsonError("ENTITLEMENT_MISSING", "No active entitlement for this product", 403, requestId);
    }

    const productSlug = await platform.desktopAuth.findProductSlug(client.productId);
    if (!productSlug) {
      return jsonError("PRODUCT_NOT_FOUND", "Product slug not found", 404, requestId);
    }

    const { ticket, expiresAt } = mintSquirrelFeedTicket({
      productId: client.productId,
      channel: parsed.channel,
      architecture: parsed.architecture,
      sessionPublicId: session.publicId,
    });

    return jsonOk(
      {
        feedBaseUrl: buildSquirrelFeedBaseUrl({
          productSlug,
          architecture: parsed.architecture,
          channel: parsed.channel,
          feedTicket: ticket,
        }),
        feedTicketExpiresAt: expiresAt.toISOString(),
      },
      requestId,
    );
  } catch (error) {
    return desktopActivateErrorResponse(error, requestId);
  }
}
