import { getAuth } from "@khepree/auth/server";
import { authRateLimitPolicy, enforceRateLimit } from "@khepree/security";
import { toNextJsHandler } from "better-auth/next-js";
import { adminAuthBaseUrl } from "@/lib/admin";

let handlers: ReturnType<typeof toNextJsHandler> | null = null;

function authHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth(adminAuthBaseUrl()));
  }
  return handlers;
}

export async function GET(request: Request) {
  return authHandlers().GET(request);
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, authRateLimitPolicy(new URL(request.url).pathname));
  if (limited) return limited;
  return authHandlers().POST(request);
}
