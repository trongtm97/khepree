import { isLicensingError } from "@khepree/licensing";
import { RATE_LIMITS, enforceRateLimit } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { licenseErrorResponse, readLicenseKey } from "@/lib/license-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.LICENSE, "refresh");
  if (limited) return limited;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const licenseKey = readLicenseKey(request, body.licenseKey);
  const installationId = typeof body.installationId === "string" ? body.installationId : "";
  if (!licenseKey || !installationId) {
    return jsonError("INVALID_LICENSE", "licenseKey and installationId are required", 401, requestId);
  }

  try {
    const result = await getPlatform().licensing.refresh({ licenseKey, installationId });
    return jsonOk(
      {
        lease: result.lease,
        publicKey: result.publicKey,
        keyId: result.keyId,
        expiresAt: new Date(result.lease.payload.exp * 1000).toISOString(),
        devicePublicId: result.device.publicId,
        features: Object.entries(result.features).map(([key, value]) => ({ key, value })),
      },
      requestId,
    );
  } catch (error) {
    if (isLicensingError(error)) return licenseErrorResponse(error, requestId);
    return jsonError("INTERNAL", "Refresh failed", 500, requestId);
  }
}
