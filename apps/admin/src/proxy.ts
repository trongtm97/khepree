import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  attachSecurityHeaders,
  enforceRateLimit,
  isMaintenanceMode,
  RATE_LIMITS,
} from "@khepree/security";
import { isProtectedPath, isPublicAuthPath, AUTH_ROUTES } from "@/lib/routes";

function finish(request: NextRequest, response: NextResponse) {
  attachSecurityHeaders(request, response);
  return response;
}

export async function proxy(request: NextRequest) {
  if (isMaintenanceMode()) {
    return finish(
      request,
      new NextResponse("Service temporarily unavailable", {
        status: 503,
        headers: { "Retry-After": "300" },
      }),
    );
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/healthz") {
    return finish(request, NextResponse.next());
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    const limited = await enforceRateLimit(request, RATE_LIMITS.SENSITIVE_MUTATION, "admin");
    if (limited) {
      return finish(request, new NextResponse(limited.body, { status: 429, headers: limited.headers }));
    }
  }

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  const hasSession = Boolean(sessionCookie?.value);

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = hasSession ? "/dashboard" : AUTH_ROUTES.signIn;
    return finish(request, NextResponse.redirect(url));
  }

  // ponytail: cookie presence ≠ valid session; bouncing sign-in→dashboard here
  // loops with requireSession when the cookie is stale. Sign-in page uses getSession.

  if (!hasSession && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.signIn;
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return finish(request, NextResponse.redirect(url));
  }

  if (!hasSession && !isPublicAuthPath(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.signIn;
    return finish(request, NextResponse.redirect(url));
  }

  return finish(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|icon.png|apple-icon|brand).*)"],
};
