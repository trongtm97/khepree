import { getSession } from "@khepree/auth/session";
import { isLicensingError } from "@khepree/licensing";
import type { PrincipalRef } from "@khepree/entitlement";
import { jsonError } from "@/lib/api-response";

export function licenseStatus(code: string): number {
  switch (code) {
    case "INVALID_LICENSE":
    case "LEASE_EXPIRED":
      return 401;
    case "DEVICE_LIMIT_REACHED":
      return 409;
    case "DEVICE_COOLDOWN":
      return 429;
    case "NOT_FOUND":
      return 404;
    case "NOT_CONFIGURED":
      return 503;
    default:
      return 403;
  }
}

export function licenseErrorResponse(error: unknown, requestId: string): Response {
  if (isLicensingError(error)) {
    return jsonError(
      error.code,
      error.message,
      licenseStatus(error.code),
      requestId,
      error.details,
    );
  }
  return jsonError("INTERNAL", "Request failed", 500, requestId);
}

export function readLicenseKey(request: Request, bodyKey?: unknown): string | null {
  if (typeof bodyKey === "string" && bodyKey.startsWith("KHPR-")) return bodyKey;
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.startsWith("KHPR-") ? token : null;
}

export async function readSessionPrincipal(): Promise<{ principal: PrincipalRef; userId: string } | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    return { principal: { type: "USER", id: session.user.id }, userId: session.user.id };
  } catch {
    return null;
  }
}
