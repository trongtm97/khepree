import { fetchOutboxHealthMetrics } from "@khepree/platform";
import { jsonError, getRequestId } from "@/lib/api-response";
import { isInternalWorkerAuthorized } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

/** Internal outbox queue metrics — no event payloads. Bearer OUTBOX_WORKER_SECRET required. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  if (!isInternalWorkerAuthorized(request)) {
    return jsonError("UNAUTHORIZED", "Invalid outbox worker secret", 401, requestId);
  }

  const metrics = await fetchOutboxHealthMetrics();
  if (!metrics) {
    return jsonError("SERVICE_UNAVAILABLE", "Database not configured", 503, requestId);
  }

  return Response.json({ status: "ok", metrics, requestId });
}
