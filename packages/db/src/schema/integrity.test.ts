import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { activations, devices } from "../schema/entitlement";

describe("licensing schema integrity", () => {
  it("scopes device uniqueness to principal + installationHash", () => {
    const config = getTableConfig(devices);
    const constraint = config.uniqueConstraints.find(
      (row) => row.name === "devices_principal_installation_unique",
    );
    expect(constraint).toBeDefined();
    expect(constraint?.columns.map((column) => column.name)).toEqual([
      "principal_type",
      "principal_id",
      "installation_hash",
    ]);
  });

  it("allows only one active activation per license + device", () => {
    const config = getTableConfig(activations);
    const index = config.indexes.find(
      (row) => row.config.name === "activations_active_license_device_unique",
    );
    expect(index).toBeDefined();
    expect(
      index?.config.columns.map((column) =>
        typeof column === "object" && column && "name" in column ? column.name : column,
      ),
    ).toEqual(["license_id", "device_id"]);
  });
});
