import { describe, expect, it } from "vitest";
import { correlationRequestId, getRequestIdFromHeaders } from "./request-id";

describe("getRequestIdFromHeaders", () => {
  it("preserves incoming request id", () => {
    const headers = new Headers({ "x-request-id": "req-abc" });
    expect(getRequestIdFromHeaders(headers)).toBe("req-abc");
  });

  it("generates uuid when header missing", () => {
    expect(getRequestIdFromHeaders(new Headers())).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("correlationRequestId", () => {
  it("reads requestId from outbox payload metadata", () => {
    expect(
      correlationRequestId({
        orderPublicId: "ord_1",
        _correlation: { requestId: "req-webhook-1" },
      }),
    ).toBe("req-webhook-1");
  });
});
