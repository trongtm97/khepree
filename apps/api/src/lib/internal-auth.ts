import { getEnv } from "@khepree/config";

export function isInternalWorkerAuthorized(request: Request): boolean {
  const secret = getEnv().OUTBOX_WORKER_SECRET;
  if (!secret || secret.includes("CHANGE_ME")) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
