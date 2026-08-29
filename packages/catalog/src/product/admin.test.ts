import { describe, expect, it } from "vitest";
import { CatalogError, rejectIfReferenced } from "./admin";

describe("catalog financial history guard", () => {
  it("rejects delete when order items reference the object", () => {
    expect(() => rejectIfReferenced(1, "price")).toThrow(CatalogError);
    expect(() => rejectIfReferenced(0, "price")).not.toThrow();
  });
});
