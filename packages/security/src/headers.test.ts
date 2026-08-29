import { describe, expect, it } from "vitest";
import { applySecurityHeaders, contentSecurityPolicy, isMaintenanceMode } from "./headers";

describe("security headers", () => {
  it("sets CSP frame-ancestors none and nosniff", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { production: false, requestId: "req_1" });
    expect(contentSecurityPolicy()).toContain("frame-ancestors 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Strict-Transport-Security")).toBeNull();
    expect(headers.get("x-request-id")).toBe("req_1");
  });

  it("sets HSTS only in production", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { production: true, requestId: "req_2" });
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });
});

describe("isMaintenanceMode", () => {
  it("reads MAINTENANCE_MODE", () => {
    expect(isMaintenanceMode({ MAINTENANCE_MODE: "1" })).toBe(true);
    expect(isMaintenanceMode({ MAINTENANCE_MODE: "true" })).toBe(true);
    expect(isMaintenanceMode({})).toBe(false);
  });
});
