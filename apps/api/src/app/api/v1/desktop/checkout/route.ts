import { accountPublicUrl, DEFAULT_LOCALE, isSupportedLocale } from "@khepree/config";
import { isCommerceError } from "@khepree/commerce";
import { isDesktopAuthError } from "@khepree/desktop-auth";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import {
  buildDesktopCheckoutHandoffUrl,
} from "@/lib/desktop-me";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
  readDesktopCheckoutBody,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_CHECKOUT, "checkout");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = readDesktopCheckoutBody(body);
  if (!input.clientId || !input.planPublicId || !input.pricePublicId) {
    return jsonError(
      "AUTH_REQUIRED",
      "clientId, planPublicId, and pricePublicId are required",
      401,
      requestId,
    );
  }

  const locale = isSupportedLocale(input.locale) ? input.locale : DEFAULT_LOCALE;
  const accountUrl = accountPublicUrl();

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, input.clientId);

    const offer = await platform.commerce.getPurchasableOffer(
      input.planPublicId,
      input.pricePublicId,
      locale,
    );
    if (!offer || offer.product.id !== client.productId) {
      return jsonError("CHECKOUT_NOT_AVAILABLE", "Plan is not available for this product", 409, requestId);
    }

    const intent = await platform.commerce.createCheckoutIntent({
      owner: { type: "user", userId: session.userId },
      planPublicId: input.planPublicId,
      pricePublicId: input.pricePublicId,
      locale,
      successUrl: `${accountUrl}/billing?checkout=processing&source=desktop`,
      cancelUrl: `${accountUrl}/billing?checkout=cancelled&source=desktop`,
      errorUrl: `${accountUrl}/billing?checkout=failed&source=desktop`,
      actorUserId: session.userId,
    });

    return jsonOk(
      {
        checkoutPublicId: intent.orderPublicId,
        handoffUrl: buildDesktopCheckoutHandoffUrl(intent.orderPublicId, input.clientId),
        status: "PENDING" as const,
      },
      requestId,
    );
  } catch (error) {
    if (isDesktopAuthError(error) || isCommerceError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop checkout failed", 500, requestId);
  }
}
