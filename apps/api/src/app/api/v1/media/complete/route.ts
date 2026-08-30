import { getSession } from "@khepree/auth/session";
import { createMediaService } from "@khepree/catalog";
import { RATE_LIMITS, enforceRateLimit } from "@khepree/security";
import { UploadValidationError } from "@khepree/storage";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.MEDIA, "complete");
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", "Authentication required", 401, requestId);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const objectKey = typeof body.objectKey === "string" ? body.objectKey : "";
  const bucket = body.bucket === "private" ? "private" : body.bucket === "public" ? "public" : null;
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const expectedSizeBytes = typeof body.expectedSizeBytes === "number" ? body.expectedSizeBytes : 0;

  if (!objectKey || !bucket || !mimeType || expectedSizeBytes <= 0) {
    return jsonError("INVALID_BODY", "Invalid complete-upload body", 400, requestId);
  }

  try {
    const media = createMediaService();
    const record = await media.completeUpload({
      objectKey,
      bucket,
      mimeType,
      expectedSizeBytes,
      altText: typeof body.altText === "string" ? body.altText : undefined,
      context: typeof body.context === "string" ? body.context : undefined,
      ownerType: "user",
      ownerId: session.user.id,
      width: typeof body.width === "number" ? body.width : undefined,
      height: typeof body.height === "number" ? body.height : undefined,
      checksumSha256: typeof body.checksumSha256 === "string" ? body.checksumSha256 : undefined,
    });
    return jsonOk(record, requestId);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return jsonError("UPLOAD_REJECTED", err.message, 400, requestId);
    }
    return jsonError("COMPLETE_FAILED", "Could not register upload", 400, requestId);
  }
}
