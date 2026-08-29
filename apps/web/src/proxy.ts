import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@khepree/config";
import { attachSecurityHeaders, isMaintenanceMode } from "@khepree/security";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

function finish(request: NextRequest, response: NextResponse) {
  attachSecurityHeaders(request, response);
  return response;
}

export function proxy(request: NextRequest) {
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

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return finish(request, NextResponse.next());
  }

  const hasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) return finish(request, NextResponse.next());

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return finish(request, NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
