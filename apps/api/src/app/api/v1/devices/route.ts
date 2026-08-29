import { isLicensingError } from "@khepree/licensing";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { licenseErrorResponse, readLicenseKey, readSessionPrincipal } from "@/lib/license-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const platform = getPlatform();

  try {
    const session = await readSessionPrincipal();
    const licenseKey = readLicenseKey(request);
    const principal = session
      ? session.principal
      : licenseKey
        ? (await platform.licensing.resolveFromLicenseKey(licenseKey)).principal
        : null;
    if (!principal) {
      return jsonError("INVALID_LICENSE", "Authentication required", 401, requestId);
    }
    const devices = await platform.licensing.listDevices(principal);
    return jsonOk(
      {
        devices: devices.map((device) => ({
          devicePublicId: device.publicId,
          platform: device.platform,
          name: device.name,
          status: device.status,
          lastSeenAt: device.lastSeenAt.toISOString(),
        })),
      },
      requestId,
    );
  } catch (error) {
    if (isLicensingError(error)) return licenseErrorResponse(error, requestId);
    return jsonError("INTERNAL", "Could not list devices", 500, requestId);
  }
}
