import { createMediaService } from "@khepree/catalog";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const requestId = getRequestId(request);
  const { publicId } = await context.params;

  try {
    const media = createMediaService();
    const download = await media.createPrivateDownloadUrl(publicId);
    return jsonOk(download, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download unavailable";
    if (message.includes("not found")) {
      return jsonError("NOT_FOUND", message, 404, requestId);
    }
    if (message.includes("Public media")) {
      return jsonError("NOT_PRIVATE", message, 400, requestId);
    }
    return jsonError("DOWNLOAD_FAILED", message, 500, requestId);
  }
}
