import assert from "node:assert/strict";
import { ADMIN_NAV, ADMIN_NAV_GROUPS, PROTECTED_PATHS, filterNavGroups } from "./routes";

const flatFromGroups = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
assert.equal(flatFromGroups.length, ADMIN_NAV.length);
assert.deepEqual(
  flatFromGroups.map((i) => i.href),
  ADMIN_NAV.map((i) => i.href),
);
assert.equal(new Set(PROTECTED_PATHS).size, PROTECTED_PATHS.length);

const filtered = filterNavGroups(ADMIN_NAV_GROUPS, () => true);
assert.equal(filtered.length, ADMIN_NAV_GROUPS.length);

console.log("routes.test: ok");
