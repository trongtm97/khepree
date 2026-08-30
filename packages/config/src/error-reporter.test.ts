import { describe, expect, it } from "vitest";
import { loggingErrorReporter, resetErrorReporterForTests } from "./error-reporter";

describe("loggingErrorReporter", () => {
  it("logs structured exception without throwing", () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (msg: string) => lines.push(msg);
    try {
      loggingErrorReporter().captureException(new Error("boom"), { requestId: "r1", service: "api" });
    } finally {
      console.error = original;
    }
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(parsed.event).toBe("exception");
    expect(parsed.requestId).toBe("r1");
    expect(parsed.password).toBeUndefined();
    resetErrorReporterForTests();
  });
});
