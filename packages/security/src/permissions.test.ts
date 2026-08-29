import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForContext } from "./permissions";

describe("permissionsForContext", () => {
  it("grants admin permissions to SUPER_ADMIN", () => {
    const perms = permissionsForContext({ globalRole: "SUPER_ADMIN" });
    expect(perms.has("admin.users.write")).toBe(true);
    expect(perms.has("finance.write")).toBe(true);
  });

  it("does not grant admin to USER", () => {
    expect(hasPermission({ globalRole: "USER" }, "admin.access")).toBe(false);
  });

  it("combines org and global permissions", () => {
    const perms = permissionsForContext({ globalRole: "USER", orgRole: "OWNER" });
    expect(perms.has("org.manage")).toBe(true);
    expect(perms.has("admin.access")).toBe(false);
  });
});
