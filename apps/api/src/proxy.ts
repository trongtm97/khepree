import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { attachSecurityHeaders, isMaintenanceMode } from "@khepree/security";

export function proxy(request: NextRequest) {
  if (isMaintenanceMode()) {
    const res = new NextResponse("Service temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300" },
    });
    attachSecurityHeaders(request, res);
    return res;
  }

  const res = NextResponse.next();
  attachSecurityHeaders(request, res);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
