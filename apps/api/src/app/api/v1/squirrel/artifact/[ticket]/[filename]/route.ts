import {
  createSquirrelFeedService,
  isCatalogError,
  sanitizeSquirrelNupkgFilename,
} from "@khepree/catalog";
import { SQUIRREL_ARTIFACT_TICKET_TTL_SECONDS } from "@khepree/config";
import { getPrivateObjectStorage } from "@khepree/storage";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError } from "@/lib/api-response";
import {
  logSquirrelArtifactDownload,
  squirrelTicketLogRef,
  verifySquirrelTicket,
} from "@/lib/squirrel-feed";
import { desktopActivateErrorResponse } from "@/lib/desktop-http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ ticket: string; filename: string }> },
) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.SQUIRREL_FEED, "artifact");
  if (limited) return limited;

  const { ticket, filename } = await context.params;
  const safeName = sanitizeSquirrelNupkgFilename(decodeURIComponent(filename));
  if (!safeName) {
    return jsonError("INVALID_INPUT", "Invalid artifact filename", 400, requestId);
  }

  const ticketRef = squirrelTicketLogRef(decodeURIComponent(ticket));

  try {
    const payload = verifySquirrelTicket(decodeURIComponent(ticket), { kind: "artifact" });
    if (!payload.releasePublicId || !payload.artifactPublicId) {
      return jsonError("INVALID_INPUT", "Invalid artifact ticket", 400, requestId);
    }

    const squirrel = createSquirrelFeedService();
    const resolved = await squirrel.resolveArtifactForDownload({
      releasePublicId: payload.releasePublicId,
      artifactPublicId: payload.artifactPublicId,
      fileName: safeName,
    });

    verifySquirrelTicket(decodeURIComponent(ticket), {
      kind: "artifact",
      productId: resolved.release.productId,
      channel: payload.channel,
      architecture: payload.architecture,
      releasePublicId: resolved.release.publicId,
      artifactPublicId: resolved.artifact.publicId,
      sessionPublicId: payload.sessionPublicId,
    });

    const ttlRemaining = Math.max(
      60,
      Math.min(
        SQUIRREL_ARTIFACT_TICKET_TTL_SECONDS,
        payload.exp - Math.floor(Date.now() / 1000),
      ),
    );

    const presigned = await getPrivateObjectStorage().createPresignedDownload({
      key: resolved.mediaObjectKey,
      bucket: "private",
      expiresInSeconds: ttlRemaining,
    });

    logSquirrelArtifactDownload({
      ticketRef,
      fileName: safeName,
      result: "success",
      releaseVersion: resolved.release.version,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: presigned.url,
        "cache-control": "private, max-age=60",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    logSquirrelArtifactDownload({
      ticketRef,
      fileName: safeName,
      result: "denied",
      reason: error instanceof Error ? error.message : "unknown",
    });
    if (isCatalogError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    if (error instanceof Error && /expired|ticket/i.test(error.message)) {
      return jsonError("DOWNLOAD_TICKET_REPLAY", error.message, 409, requestId);
    }
    return jsonError("DOWNLOAD_NOT_AUTHORIZED", "Artifact download denied", 403, requestId);
  }
}
