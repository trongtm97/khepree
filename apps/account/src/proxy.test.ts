import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(path: string, cookie?: string) {
  const url = new URL(path, "http://localhost:3001");
  const req = new NextRequest(url);
  if (cookie) {
    req.cookies.set("better-auth.session_token", cookie);
  }
  return req;
}

describe("account proxy", () => {
  it("redirects unauthenticated users from protected routes to sign-in", async () => {
    const res = await proxy(request("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(res.headers.get("location")).toContain("next=%2Fdashboard");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("does not bounce sign-in on cookie presence alone (avoids stale-cookie loops)", async () => {
    const res = await proxy(request("/sign-in", "stale-session-token"));
    expect(res.status).not.toBe(307);
  });

  it("redirects unauthenticated checkout with query as a safe return path", async () => {
    const res = await proxy(request("/checkout?plan=abc&price=def"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/sign-in");
    expect(location).toContain("next=");
    expect(decodeURIComponent(new URL(location).searchParams.get("next") ?? "")).toBe(
      "/checkout?plan=abc&price=def",
    );
  });

  it("allows reset-password while cookie present", async () => {
    const res = await proxy(request("/reset-password", "session-token"));
    expect(res.status).not.toBe(307);
  });

  it("allows accept-legal while cookie present", async () => {
    const res = await proxy(request("/accept-legal", "session-token"));
    expect(res.status).not.toBe(307);
  });

  it("allows protected routes when a session cookie is present", async () => {
    const res = await proxy(request("/dashboard", "session-token"));
    expect(res.status).not.toBe(307);
  });
});
