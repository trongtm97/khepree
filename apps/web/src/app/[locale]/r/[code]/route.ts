import { accountPublicUrl } from "@/lib/urls";
import { createPartnerPlatform, newVisitorId } from "@khepree/reseller";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const VISITOR_COOKIE = "khepree_vid";

export async function GET(
  _request: Request,
  context: { params: Promise<{ locale: string; code: string }> },
) {
  const { code } = await context.params;
  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value || newVisitorId();
  try {
    await createPartnerPlatform().partner.recordClick({ code, visitorId });
  } catch {
    // Invalid code or missing DB still lands on sign-up with the ref query.
  }
  const account = accountPublicUrl();
  const url = new URL("/sign-up", account);
  url.searchParams.set("ref", code.toUpperCase());
  const response = NextResponse.redirect(url);
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return response;
}
