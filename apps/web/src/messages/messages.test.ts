import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";

function messagePaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => messagePaths(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return messagePaths(nested, path);
    });
  }
  return [prefix];
}

describe("messages contract", () => {
  it("vi matches en leaf paths", () => {
    expect(messagePaths(vi).sort()).toEqual(messagePaths(en).sort());
  });
});
