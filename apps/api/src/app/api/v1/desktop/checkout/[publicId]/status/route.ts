import { isDesktopAuthError } from "@khepree/desktop-auth";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { resolveDesktopCheckoutStatusForOrder } from "@/lib/desktop-me";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_CHECKOUT, "checkout-status");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const { publicId } = await context.params;
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    if (clientId) {
      platform.desktopAuth.assertSessionClient(session, client, clientId);
    }

    const owner = { type: "user" as const, userId: session.userId };
    const checkoutSession = await platform.commerce.getCheckoutSession(publicId, owner);
    if (!checkoutSession) {
      return jsonError("NOT_FOUND", "Checkout not found", 404, requestId);
    }

    const productId = checkoutSession.items[0]?.productId;
    if (!productId || productId !== client.productId) {
      return jsonError("PRODUCT_NOT_ALLOWED", "Checkout does not belong to this product", 403, requestId);
    }

    const status = await resolveDesktopCheckoutStatusForOrder(platform, {
      userId: session.userId,
      orderPublicId: publicId,
      productId,
    });

    return jsonOk(
      {
        checkoutPublicId: publicId,
        status,
        orderStatus: checkoutSession.order.status,
      },
      requestId,
    );
  } catch (error) {
    if (isDesktopAuthError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Checkout status failed", 500, requestId);
  }
}
