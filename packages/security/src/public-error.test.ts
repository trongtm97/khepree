import { afterEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ACTION_ERROR, publicActionError } from "./public-error";

function isKnown(value: unknown): value is { message: string } {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicActionError", () => {
  it("returns known domain messages", () => {
    expect(publicActionError({ code: "X", message: "Nope" }, isKnown)).toBe("Nope");
  });

  it("hides unexpected errors in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(publicActionError(new Error("ECONNREFUSED postgres"), isKnown)).toBe(GENERIC_ACTION_ERROR);
  });
});
