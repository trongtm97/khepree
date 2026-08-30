import { getEnv } from "@khepree/config";
import { createKhepreeOutboxWorker } from "@khepree/platform";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = getEnv().OUTBOX_WORKER_SECRET;
  if (!secret || secret.includes("CHANGE_ME")) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Secure cron/internal trigger for the durable outbox worker. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isAuthorized(request)) {
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
