import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { isCatalogError } from "@khepree/catalog";
import { getRequestId, jsonError } from "@/lib/api-response";
import {
  buildSquirrelFeedResponse,
  parseSquirrelFeedPath,
  resolveSquirrelProductId,
} from "@/lib/squirrel-feed";
import { desktopActivateErrorResponse } from "@/lib/desktop-http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ productSlug: string; architecture: string; channel: string }>;
  },
) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.SQUIRREL_FEED, "releases");
  if (limited) return limited;

  const { productSlug, architecture, channel } = await context.params;
  const parsed = parseSquirrelFeedPath({ productSlug, architecture, channel });
  if (typeof parsed === "string") {
    return jsonError("INVALID_INPUT", `Invalid Squirrel feed path: ${parsed}`, 400, requestId);
  }

  const productId = await resolveSquirrelProductId(parsed.productSlug);
  if (!productId) {
    return squirrelReleasesResponse("", requestId);
  }

  const url = new URL(request.url);
  const feedTicket = url.searchParams.get("ft");

  try {
    const feed = await buildSquirrelFeedResponse({
      productId,
      productSlug: parsed.productSlug,
      architecture: parsed.architecture,
      channel: parsed.channel,
      feedTicket,
    });
    return squirrelReleasesResponse(feed.body, requestId);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "FEED_TICKET_REQUIRED") {
      return jsonError("AUTH_REQUIRED", "Feed ticket is required for this product", 401, requestId);
    }
    if (isCatalogError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Squirrel feed unavailable", 500, requestId);
  }
}

function squirrelReleasesResponse(body: string, requestId: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}
