import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isProtectedPath, isPublicAuthPath, AUTH_ROUTES } from "@/lib/routes";

/** Optimistic route-level auth redirect — server layouts still validate session. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const hasSession = Boolean(sessionCookie?.value);

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = hasSession ? "/dashboard" : AUTH_ROUTES.signIn;
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublicAuthPath(pathname) && pathname !== AUTH_ROUTES.resetPassword) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!hasSession && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.signIn;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
    "/sign-in",
    "/sign-up",
    "/verify-email",
    "/forgot-password",
  ],
};
