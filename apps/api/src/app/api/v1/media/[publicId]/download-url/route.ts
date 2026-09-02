import { getSession } from "@khepree/auth/session";
import {
  createDownloadService,
  createMediaService,
  isReleaseMediaContext,
  productIdFromMediaContext,
} from "@khepree/catalog";
import { RATE_LIMITS, enforceRateLimit } from "@khepree/security";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.MEDIA, "download");
  if (limited) return limited;

  const { publicId } = await context.params;
  const session = await getSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", "Authentication required for private download", 401, requestId);
  }

  try {
    const media = await createMediaService().getByPublicId(publicId);
    if (!media) {
      return jsonError("NOT_FOUND", "Media not found", 404, requestId);
    }

    if (isReleaseMediaContext(media.context)) {
      return jsonError(
        "FORBIDDEN",
        "Release artifacts must use the desktop updates download API",
        403,
        requestId,
      );
    }

    const productId = productIdFromMediaContext(media.context);
    const entitled = productId
      ? await getPlatform().entitlement.canUseProduct({ type: "USER", id: session.user.id }, productId)
      : false;

    const download = await createDownloadService().authorizePrivateDownload({
      mediaPublicId: publicId,
      context: {
        actorUserId: session.user.id,
        purpose: "download",
        entitled,
      },
    });
    return jsonOk(download, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download unavailable";
    if (message.includes("not found")) {
      return jsonError("NOT_FOUND", "Media not found", 404, requestId);
    }
    if (message.includes("not authorized")) {
      return jsonError("FORBIDDEN", "Download not authorized", 403, requestId);
    }
    if (message.includes("Public media")) {
      return jsonError("NOT_PRIVATE", "Public media does not use a signed URL", 400, requestId);
    }
    return jsonError("DOWNLOAD_FAILED", "Download unavailable", 500, requestId);
  }
}
