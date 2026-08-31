import { isDesktopAuthError } from "@khepree/desktop-auth";
import { isLicensingError } from "@khepree/licensing";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import {
  desktopActivateErrorResponse,
  readDesktopAccessToken,
  readDesktopActivateBody,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_ACTIVATE, "activate");
  if (limited) return limited;

  const accessToken = readDesktopAccessToken(request);
  if (!accessToken) {
    return jsonError("AUTH_REQUIRED", "Bearer access token is required", 401, requestId);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = readDesktopActivateBody(body);
  if (!input.clientId || !input.installationId) {
    return jsonError(
      "AUTH_REQUIRED",
      "clientId and installationId are required",
      401,
      requestId,
    );
  }

  try {
    const platform = getPlatform();
    const { session, client } = await platform.desktopAuth.resolveAccessSession(accessToken);
    platform.desktopAuth.assertSessionClient(session, client, input.clientId);

    const result = await platform.licensing.activateByPrincipal({
      principal: { type: "USER", id: session.userId },
      productId: client.productId,
      installationId: input.installationId,
      platform: input.platform,
      deviceName: input.deviceName,
    });

    await platform.desktopAuth.bindSessionDevice(session.id, {
      deviceId: result.device.id,
      devicePublicKey: input.devicePublicKey?.trim() || undefined,
    });

    const entitlementRows = await platform.entitlement.resolveEntitlementsForPrincipal({
      type: "USER",
      id: session.userId,
    });
    const entitlementRow = entitlementRows.find(
      (row) => row.entitlement.productId === client.productId,
    );
    if (!entitlementRow) {
      return jsonError("ENTITLEMENT_MISSING", "No entitlement for this product", 403, requestId);
    }

    await platform.desktopAuth.recordDeviceActivated({
      userId: session.userId,
      client,
      devicePublicId: result.device.publicId,
      appVersion: input.appVersion,
      ipAddress: clientIp(request),
    });

    return jsonOk(
      {
        lease: result.lease,
        publicKey: result.publicKey,
        keyId: result.keyId,
        expiresAt: new Date(result.lease.payload.exp * 1000).toISOString(),
        devicePublicId: result.device.publicId,
        features: Object.entries(result.features).map(([key, value]) => ({ key, value })),
        entitlement: {
          entitlementPublicId: entitlementRow.entitlement.publicId,
          productSlug: entitlementRow.productSlug,
          planSlug: entitlementRow.planSlug,
          status: entitlementRow.entitlement.status,
          expiresAt: entitlementRow.entitlement.expiresAt?.toISOString() ?? null,
          features: entitlementRow.features,
        },
      },
      requestId,
    );
  } catch (error) {
    if (isDesktopAuthError(error) || isLicensingError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop activation failed", 500, requestId);
  }
}
