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

    const rows = await platform.entitlement.resolveEntitlementsForPrincipal(principal);
    return jsonOk(
      {
        entitlements: rows.map((row) => ({
          entitlementPublicId: row.entitlement.publicId,
          productSlug: row.productSlug,
          planSlug: row.planSlug,
          status: row.entitlement.status,
          source: row.entitlement.source,
          startsAt: row.entitlement.startsAt.toISOString(),
          expiresAt: row.entitlement.expiresAt?.toISOString() ?? null,
          features: row.features,
        })),
      },
      requestId,
    );
  } catch (error) {
    if (isLicensingError(error)) return licenseErrorResponse(error, requestId);
    return jsonError("INTERNAL", "Could not list entitlements", 500, requestId);
  }
}
