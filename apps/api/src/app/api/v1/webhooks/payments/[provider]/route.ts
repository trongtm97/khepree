import { isCommerceError, MOCK_PROVIDER_ID } from "@khepree/commerce";
import { createLogger } from "@khepree/config";
import { RATE_LIMITS, enforceRateLimit } from "@khepree/security";
import { jsonError, jsonOk, getRequestId } from "@/lib/api-response";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

const log = createLogger("api");

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const requestId = getRequestId(request);
  const { provider } = await context.params;
  const limited = enforceRateLimit(request, RATE_LIMITS.WEBHOOK, provider);
  if (limited) return limited;

  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  try {
    const result = await getPlatform().commerce.processWebhook({
      providerId: provider || MOCK_PROVIDER_ID,
      headers,
      rawBody,
    });
    log.info({ event: "webhook_processed", requestId, provider, status: result.status });
    return jsonOk({ status: result.status }, requestId);
  } catch (error) {
    if (isCommerceError(error)) {
      log.warn({ event: "webhook_rejected", requestId, provider, code: error.code });
      if (error.code === "WEBHOOK_INVALID") {
        return jsonError("WEBHOOK_INVALID", "Webhook could not be verified", 400, requestId);
      }
      if (error.code === "UNKNOWN_PROVIDER") {
        return jsonError("UNKNOWN_PROVIDER", "Unknown payment provider", 404, requestId);
      }
    }
    log.error({ event: "webhook_failed", requestId, provider });
    return jsonError("WEBHOOK_FAILED", "Webhook could not be processed", 500, requestId);
  }
}
