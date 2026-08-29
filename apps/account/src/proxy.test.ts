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
  it("redirects unauthenticated users from protected routes to sign-in", () => {
    const res = proxy(request("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(res.headers.get("location")).toContain("next=%2Fdashboard");
  });

  it("redirects authenticated users away from sign-in", () => {
    const res = proxy(request("/sign-in", "session-token"));
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("allows reset-password while authenticated", () => {
    const res = proxy(request("/reset-password", "session-token"));
    expect(res.status).not.toBe(307);
  });
});
