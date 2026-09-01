import { createProductService } from "@khepree/catalog";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_MARKET_REGION, isSupportedLocale } from "@khepree/config";
import { isEntitlementActive } from "@khepree/db";
import { isDesktopAuthError } from "@khepree/desktop-auth";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { buildDesktopPurchasablePlans } from "@/lib/desktop-plans";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_PLANS, "plans");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId")?.trim() ?? "";
  if (!clientId) {
    return jsonError("AUTH_REQUIRED", "clientId query parameter is required", 401, requestId);
  }

  const localeParam = url.searchParams.get("locale");
  const locale = isSupportedLocale(localeParam) ? localeParam : DEFAULT_LOCALE;

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, clientId);

    const productSlug = await platform.desktopAuth.findProductSlug(client.productId);
    if (!productSlug) {
      return jsonError("PRODUCT_NOT_FOUND", "Product not found for desktop client", 404, requestId);
    }

    const productService = createProductService();
    const product = await productService.getPublicProductBySlug(productSlug, {
      locale,
      market: { currency: DEFAULT_CURRENCY, region: DEFAULT_MARKET_REGION },
    });
    if (!product) {
      return jsonError("PRODUCT_NOT_FOUND", "Product catalog not found", 404, requestId);
    }

    const principal = { type: "USER" as const, id: session.userId };
    const entitlementRows = await platform.entitlement.resolveEntitlementsForPrincipal(principal);
    const entitlementRow = entitlementRows.find(
      (row) => row.entitlement.productId === client.productId,
    );
    const entitlementActive =
      entitlementRow != null &&
      isEntitlementActive({ ...entitlementRow.entitlement, now: new Date() }) &&
      entitlementRow.entitlement.status === "active";

    const plans = buildDesktopPurchasablePlans({
      plans: product.plans,
      currentPlanSlug: entitlementRow?.planSlug ?? null,
      entitlementActive,
    });

    const currentPlan = plans.find((plan) => plan.isCurrent);
    const currentPlanId = currentPlan
      ? `${currentPlan.planPublicId}:${currentPlan.pricePublicId}`
      : null;

    return jsonOk({ currentPlanId, plans }, requestId);
  } catch (error) {
    if (isDesktopAuthError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop plans failed", 500, requestId);
  }
}
