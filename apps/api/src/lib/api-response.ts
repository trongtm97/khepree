import type { ApiErrorBody } from "@khepree/types";
import { getRequestIdFromHeaders } from "@khepree/config";

export function jsonError(
  code: string,
  message: string,
  status: number,
  requestId?: string,
  details?: Record<string, unknown>,
): Response {
  const body: ApiErrorBody = {
    error: { code, message, requestId, ...(details ? { details } : {}) },
  };
  return Response.json(body, { status });
}

export function jsonOk<T>(data: T, requestId?: string): Response {
  return Response.json({ data, meta: requestId ? { requestId } : undefined });
}

export function getRequestId(request: Request): string {
  return getRequestIdFromHeaders(request.headers);
}
