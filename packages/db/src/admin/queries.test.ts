import { describe, expect, it } from "vitest";
import { adminOffset, ADMIN_PAGE_SIZE } from "./queries";

describe("adminOffset", () => {
  it("pages from 1", () => {
    expect(adminOffset(1)).toBe(0);
    expect(adminOffset(2)).toBe(ADMIN_PAGE_SIZE);
    expect(adminOffset(0)).toBe(0);
  });
});
