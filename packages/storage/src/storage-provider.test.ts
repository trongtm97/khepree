import { describe, expect, it } from "vitest";
import { storageProviderForDb } from "./storage-provider";

describe("storageProviderForDb", () => {
  it("maps runtime providers to persisted enum values", () => {
    expect(storageProviderForDb("s3")).toBe("s3");
    expect(storageProviderForDb("mock")).toBe("mock");
    expect(storageProviderForDb("r2")).toBe("r2");
    expect(storageProviderForDb("unknown")).toBe("s3");
  });
});
