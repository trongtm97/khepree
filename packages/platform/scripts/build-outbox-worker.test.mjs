import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("outbox worker bundle excludes sharp createRequire shim", () => {
  execFileSync("node", ["scripts/build-outbox-worker.mjs"], { cwd: root, stdio: "pipe" });
  const bundle = readFileSync(join(root, "dist/outbox-worker.cjs"), "utf8");
  assert.doesNotMatch(bundle, /createRequire\(import_meta\.url\)/);
  assert.doesNotMatch(bundle, /sharp@0\.35/);
});
