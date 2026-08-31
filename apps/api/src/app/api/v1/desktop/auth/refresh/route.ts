import { isDesktopAuthError } from "@khepree/desktop-auth";
import { isLicensingError } from "@khepree/licensing";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import {
  desktopActivateErrorResponse,
  readDesktopRefreshBody,
  sha256Hex,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

const REFRESH_PATH = "/api/v1/desktop/auth/refresh";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_REFRESH, "refresh");
  if (limited) return limited;

  const rawBody = await request.text();
  const bodySha256 = sha256Hex(rawBody);
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  } catch {
    body = {};
  }
  const input = readDesktopRefreshBody(body);
  if (!input.sessionPublicId || !input.refreshToken || !input.deviceProof.nonce) {
    return jsonError(
      "REFRESH_TOKEN_INVALID",
      "sessionPublicId, refreshToken, and deviceProof are required",
      401,
      requestId,
    );
  }

  try {
    const platform = getPlatform();
    const tokens = await platform.desktopAuth.refreshSession(
      {
        sessionPublicId: input.sessionPublicId,
        refreshToken: input.refreshToken,
        deviceProof: input.deviceProof,
        proofMethod: "POST",
        proofPath: REFRESH_PATH,
        bodySha256,
      },
      { ipAddress: clientIp(request) },
    );

    const session = await platform.desktopAuth.findSessionByPublicId(input.sessionPublicId);
    if (!session?.deviceId) {
      return jsonError("DEVICE_REMOVED", "Device is not activated on this session", 403, requestId);
    }

    const leaseResult = await platform.licensing.refreshByDevice({
      principal: { type: "USER", id: session.userId },
      productId: session.productId,
      deviceId: session.deviceId,
    });

    return jsonOk(
      {
        ...tokens,
        lease: leaseResult.lease,
        publicKey: leaseResult.publicKey,
        keyId: leaseResult.keyId,
        expiresAt: new Date(leaseResult.lease.payload.exp * 1000).toISOString(),
        devicePublicId: leaseResult.device.publicId,
        features: Object.entries(leaseResult.features).map(([key, value]) => ({ key, value })),
      },
      requestId,
    );
  } catch (error) {
    if (isDesktopAuthError(error) || isLicensingError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop refresh failed", 500, requestId);
  }
}
