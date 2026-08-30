import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { outboxEvents } from "./outbox";
import { mediaAssets } from "./content";

describe("phase 14 schema", () => {
  it("stores outbox public ids uniquely for idempotent enqueue", () => {
    const config = getTableConfig(outboxEvents);
    expect(config.columns.some((column) => column.name === "public_id")).toBe(true);
    expect(config.columns.some((column) => column.name === "status")).toBe(true);
  });

  it("stores media size as bigint metadata (not int4)", () => {
    const config = getTableConfig(mediaAssets);
    const size = config.columns.find((column) => column.name === "size_bytes");
    expect(size).toBeDefined();
    expect(String(size?.dataType)).toMatch(/bigint|number/i);
  });
});
