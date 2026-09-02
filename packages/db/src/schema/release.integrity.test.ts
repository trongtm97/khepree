import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { releaseArtifacts } from "./release";

describe("release schema integrity", () => {
  it("scopes artifact filenames uniquely per release", () => {
    const config = getTableConfig(releaseArtifacts);
    const constraint = config.uniqueConstraints.find(
      (row) => row.name === "release_artifacts_release_file_unique",
    );
    expect(constraint).toBeDefined();
    expect(constraint?.columns.map((column) => column.name)).toEqual([
      "release_id",
      "file_name",
    ]);
  });

  it("restricts singleton artifact kinds per release", () => {
    const config = getTableConfig(releaseArtifacts);
    const index = config.indexes.find(
      (row) => row.config.name === "release_artifacts_release_singleton_kind_unique",
    );
    expect(index).toBeDefined();
    expect(index?.config.unique).toBe(true);
  });

  it("cascades artifact deletion when release is removed", () => {
    const config = getTableConfig(releaseArtifacts);
    const fk = config.foreignKeys.find((row) => row.reference().columns[0]?.name === "release_id");
    expect(fk?.onDelete).toBe("cascade");
  });
});
