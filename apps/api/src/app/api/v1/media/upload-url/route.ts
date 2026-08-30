import { getSession } from "@khepree/auth/session";
import { createMediaService } from "@khepree/catalog";
import { RATE_LIMITS, enforceRateLimit } from "@khepree/security";
import { UploadValidationError } from "@khepree/storage";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.MEDIA);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", "Authentication required", 401, requestId);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;
  const visibility = body.visibility === "private" ? "private" : body.visibility === "public" ? "public" : null;
  const namespace = typeof body.namespace === "string" ? body.namespace : "";
  const context = typeof body.context === "string" ? body.context : undefined;

  if (!mimeType || !namespace || !visibility || sizeBytes <= 0) {
    return jsonError("INVALID_BODY", "Invalid upload request body", 400, requestId);
  }

  try {
    const media = createMediaService();
    const result = await media.prepareUpload({
      mimeType,
      sizeBytes,
      visibility,
      namespace,
      context,
      ownerType: "user",
      ownerId: session.user.id,
    });
    return jsonOk(result, requestId);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return jsonError("UPLOAD_REJECTED", err.message, 400, requestId);
    }
    return jsonError("UPLOAD_FAILED", "Could not prepare upload", 500, requestId);
  }
}
