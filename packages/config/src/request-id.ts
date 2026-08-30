export const REQUEST_ID_HEADER = "x-request-id";

/** Read or mint a request ID from incoming headers. */
export function getRequestIdFromHeaders(headers: Headers | { get(name: string): string | null }): string {
  return headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

/** Extract correlation ID from outbox/commerce event payload metadata. */
export function correlationRequestId(payload: Record<string, unknown>): string | undefined {
  const correlation = payload._correlation;
  if (!correlation || typeof correlation !== "object") return undefined;
  const requestId = (correlation as { requestId?: unknown }).requestId;
  return typeof requestId === "string" && requestId.length > 0 ? requestId : undefined;
}
