import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, isSupportedLocale } from "@khepree/config";
import { attachSecurityHeaders, isMaintenanceMode } from "@khepree/security";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { matchPublicRedirect } from "@/lib/redirects";

const PUBLIC_FILE = /\.(.*)$/;

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

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return finish(request, NextResponse.next());
  }

  try {
    const hit = await matchPublicRedirect(pathname);
    if (hit) {
      const url = request.nextUrl.clone();
      url.pathname = hit.toPath;
      return finish(request, NextResponse.redirect(url, hit.status));
    }
  } catch {
    /* database optional on the public edge — skip redirects if lookup fails */
  }

  const hasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    const locale = pathname.split("/")[1] ?? DEFAULT_LOCALE;
    const response = finish(request, NextResponse.next());
    if (isSupportedLocale(locale)) {
      response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  const redirectResponse = finish(request, NextResponse.redirect(url, 308));
  redirectResponse.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return redirectResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|icon.png|apple-icon|robots.txt|sitemap.xml).*)"],
};
