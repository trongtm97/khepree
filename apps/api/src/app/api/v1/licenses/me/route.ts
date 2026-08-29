import { maskLicenseKey } from "@khepree/entitlement";
import { isLicensingError } from "@khepree/licensing";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import { licenseErrorResponse, readLicenseKey, readSessionPrincipal } from "@/lib/license-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const platform = getPlatform();

  try {
    const principal = await resolvePrincipal(request, platform);
    if (!principal) {
      return jsonError("INVALID_LICENSE", "Authentication required", 401, requestId);
    }
    const rows = await platform.licensing.listLicenses(principal);
    return jsonOk(
      {
        licenses: rows.map((row) => ({
          licensePublicId: row.license.publicId,
          entitlementPublicId: row.entitlement.publicId,
          productSlug: row.productSlug,
          planSlug: row.planSlug,
          status: row.entitlement.status,
          expiresAt: row.entitlement.expiresAt?.toISOString() ?? null,
          keyHint: maskLicenseKey(row.license.keyPrefix, row.license.keyLast4),
          activationStatus: row.activations.some((item) => item.status === "active")
            ? "activated"
            : "inactive",
          devices: row.devices.map((device) => ({
            devicePublicId: device.publicId,
            platform: device.platform,
            name: device.name,
            status: device.status,
            lastSeenAt: device.lastSeenAt.toISOString(),
          })),
        })),
      },
      requestId,
    );
  } catch (error) {
    if (isLicensingError(error)) return licenseErrorResponse(error, requestId);
    return jsonError("INTERNAL", "Could not list licenses", 500, requestId);
  }
}

async function resolvePrincipal(
  request: Request,
  platform: ReturnType<typeof getPlatform>,
) {
  const session = await readSessionPrincipal();
  if (session) return session.principal;
  const licenseKey = readLicenseKey(request);
  if (!licenseKey) return null;
  const access = await platform.licensing.resolveFromLicenseKey(licenseKey);
  return access.principal;
}
