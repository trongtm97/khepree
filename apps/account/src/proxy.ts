import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  attachSecurityHeaders,
  enforceRateLimit,
  isMaintenanceMode,
  RATE_LIMITS,
} from "@khepree/security";
import { isProtectedPath, AUTH_ROUTES } from "@/lib/routes";

function finish(request: NextRequest, response: NextResponse) {
  attachSecurityHeaders(request, response);
  return response;
}

/** Optimistic route-level auth redirect — server layouts still validate session.
 * getSessionCookie is not available in our better-auth version; cookie names are stable. */
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
    const limited = await enforceRateLimit(request, RATE_LIMITS.SENSITIVE_MUTATION, "account");
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

  // ponytail: do not bounce auth pages on cookie presence alone — stale cookies
  // looped sign-in ↔ dashboard (proxy "logged in" + requireSession "logged out").
  // Real session redirect lives on the sign-in page via getSession.

  if (!hasSession && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.signIn;
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return finish(request, NextResponse.redirect(url));
  }

  return finish(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/profile/:path*",
    "/security/:path*",
    "/sessions/:path*",
    "/products/:path*",
    "/licenses/:path*",
    "/devices/:path*",
    "/billing/:path*",
    "/downloads/:path*",
    "/checkout",
    "/checkout/:path*",
    "/sign-in",
    "/sign-up",
    "/accept-legal",
    "/verify-email",
    "/forgot-password",
    "/desktop/:path*",
    "/healthz",
  ],
};
