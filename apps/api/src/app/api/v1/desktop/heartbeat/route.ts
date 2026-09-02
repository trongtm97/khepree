import { isDesktopAuthError } from "@khepree/desktop-auth";
import { enforceRateLimit, RATE_LIMITS } from "@khepree/security";
import { getRequestId, jsonError, jsonOk } from "@/lib/api-response";
import {
  desktopActivateErrorResponse,
  desktopDeviceProofBodySha256,
  readDesktopAccessToken,
  readDesktopHeartbeatBody,
} from "@/lib/desktop-http";
import { getPlatform } from "@/lib/platform";

export const dynamic = "force-dynamic";

const HEARTBEAT_PATH = "/api/v1/desktop/heartbeat";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await enforceRateLimit(request, RATE_LIMITS.DESKTOP_HEARTBEAT, "heartbeat");
  if (limited) return limited;

  const rawBody = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  } catch {
    body = {};
  }
  const bearer = readDesktopAccessToken(request);
  const parsed = readDesktopHeartbeatBody(body);
  const accessToken = parsed.accessToken || bearer || "";
  if (!parsed.sessionPublicId || !accessToken || !parsed.deviceProof.nonce) {
    return jsonError(
      "AUTH_REQUIRED",
      "sessionPublicId, access token, and deviceProof are required",
      401,
      requestId,
    );
  }
  const bodySha256 = desktopDeviceProofBodySha256({
    sessionPublicId: parsed.sessionPublicId,
    accessToken,
  });

  try {
    const result = await getPlatform().desktopAuth.heartbeat({
      sessionPublicId: parsed.sessionPublicId,
      accessToken,
      deviceProof: parsed.deviceProof,
      proofMethod: "POST",
      proofPath: HEARTBEAT_PATH,
      bodySha256,
    });
    return jsonOk(result, requestId);
  } catch (error) {
    if (isDesktopAuthError(error)) {
      return desktopActivateErrorResponse(error, requestId);
    }
    return jsonError("INTERNAL", "Desktop heartbeat failed", 500, requestId);
  }
}
