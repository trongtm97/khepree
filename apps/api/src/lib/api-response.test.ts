import { describe, expect, it } from "vitest";
import { jsonError, jsonOk } from "./api-response";

describe("api-response", () => {
  it("returns typed error shape", async () => {
    const res = jsonError("TEST", "Test error", 400, "req-1");
    const body = await res.json();
    expect(body.error.code).toBe("TEST");
    expect(body.error.requestId).toBe("req-1");
  });

  it("returns success envelope", async () => {
    const res = jsonOk({ ok: true });
    const body = await res.json();
    expect(body.data.ok).toBe(true);
  });
});
