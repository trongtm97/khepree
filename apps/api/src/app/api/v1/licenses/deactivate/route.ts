import { isLicensingError } from "@khepree/licensing";
import { RATE_LIMITS, enforceRateLimit } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { licenseErrorResponse, readLicenseKey, readSessionPrincipal } from "@/lib/license-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = enforceRateLimit(request, RATE_LIMITS.LICENSE, "deactivate");
  if (limited) return limited;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const licenseKey = readLicenseKey(request, body.licenseKey);
  const session = await readSessionPrincipal();
  const installationId = typeof body.installationId === "string" ? body.installationId : undefined;
  const devicePublicId = typeof body.devicePublicId === "string" ? body.devicePublicId : undefined;

  if (!licenseKey && !session) {
    return jsonError("INVALID_LICENSE", "Authentication required", 401, requestId);
  }

  try {
    const device = await getPlatform().licensing.deactivate({
      licenseKey: licenseKey ?? undefined,
      principal: session?.principal,
      installationId,
      devicePublicId,
      actorUserId: session?.userId ?? null,
    });
    return jsonOk(
      {
        devicePublicId: device.publicId,
        status: device.status,
      },
      requestId,
    );
  } catch (error) {
    if (isLicensingError(error)) return licenseErrorResponse(error, requestId);
    return jsonError("INTERNAL", "Deactivation failed", 500, requestId);
  }
}
