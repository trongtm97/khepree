import { createKhepreeOutboxWorker } from "@khepree/platform";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";
import { isInternalWorkerAuthorized } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

/** Secure cron/internal trigger for the durable outbox worker. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isInternalWorkerAuthorized(request)) {
    return jsonError("UNAUTHORIZED", "Invalid outbox worker secret", 401, requestId);
  }
  try {
    const result = await createKhepreeOutboxWorker().runOnce();
    return jsonOk(result, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outbox run failed";
    return jsonError("OUTBOX_ERROR", message, 500, requestId);
  }
}
