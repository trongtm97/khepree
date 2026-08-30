import { describe, expect, it } from "vitest";
import { createLogger, redact } from "./logger";

describe("redact", () => {
  it("redacts password, authorization, cookies, secrets, tokens, and keys", () => {
    const out = redact({
      password: "hunter2",
      authorization: "Bearer abc",
      cookie: "session=1",
      secret: "s",
      token: "t",
      privateKey: "pem",
      nested: { api_key: "k", ok: true },
    }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.cookie).toBe("[REDACTED]");
    expect(out.secret).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect(out.privateKey).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).api_key).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).ok).toBe(true);
  });
});

describe("createLogger", () => {
  it("emits json with event name", () => {
    const lines: string[] = [];
    const spy = (msg: string) => lines.push(msg);
    const original = console.info;
    console.info = spy as typeof console.info;
    try {
      createLogger("api").info({ event: "webhook_received", requestId: "r1" });
    } finally {
      console.info = original;
    }
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(parsed.event).toBe("webhook_received");
    expect(parsed.service).toBe("api");
    expect(parsed.requestId).toBe("r1");
    expect(parsed.timestamp).toBeTypeOf("string");
  });
});
