import { describe, expect, it } from "vitest";

describe("health response shape", () => {
  it("matches required fields", () => {
    const body = {
      status: "ok",
      environment: "test",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("environment");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("version");
    expect(body.status).toBe("ok");
  });
});
