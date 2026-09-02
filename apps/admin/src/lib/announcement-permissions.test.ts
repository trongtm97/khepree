import assert from "node:assert/strict";
import { hasPermission } from "@khepree/security";

assert.equal(hasPermission({ globalRole: "SUPPORT" }, "catalog.read"), true);
assert.equal(hasPermission({ globalRole: "SUPPORT" }, "catalog.write"), false);
assert.equal(hasPermission({ globalRole: "ADMIN" }, "catalog.write"), true);

console.log("announcement-permissions.test: ok");
