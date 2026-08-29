import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForContext } from "./permissions";
import { adminMfaRequired, canAssignGlobalRole, isStaffRole, parseAdminReason } from "./guards";

describe("permissionsForContext", () => {
  it("combines org and global permissions", () => {
    const perms = permissionsForContext({ globalRole: "USER", orgRole: "OWNER" });
    expect(perms.has("org.manage")).toBe(true);
    expect(perms.has("admin.access")).toBe(false);
  });

  it("grants partner.access to sales and partner.manage only to owner/manager", () => {
    expect(hasPermission({ partnerRole: "PARTNER_SALES" }, "partner.access")).toBe(true);
    expect(hasPermission({ partnerRole: "PARTNER_SALES" }, "partner.manage")).toBe(false);
    expect(hasPermission({ partnerRole: "PARTNER_MANAGER" }, "partner.manage")).toBe(true);
    expect(hasPermission({ partnerRole: "PARTNER_OWNER" }, "partner.manage")).toBe(true);
  });
});

describe("admin permission matrix", () => {
  it("does not grant admin.access to USER or partner-only context", () => {
    expect(hasPermission({ globalRole: "USER" }, "admin.access")).toBe(false);
    expect(hasPermission({ partnerRole: "PARTNER_OWNER" }, "admin.access")).toBe(false);
    expect(isStaffRole("USER")).toBe(false);
  });

  it("lets SUPPORT read users/entitlements but not finance, catalog, or grants", () => {
    const ctx = { globalRole: "SUPPORT" as const };
    expect(hasPermission(ctx, "admin.access")).toBe(true);
    expect(hasPermission(ctx, "admin.users.read")).toBe(true);
    expect(hasPermission(ctx, "entitlement.read")).toBe(true);
    expect(hasPermission(ctx, "admin.users.write")).toBe(false);
    expect(hasPermission(ctx, "finance.write")).toBe(false);
    expect(hasPermission(ctx, "finance.read")).toBe(false);
    expect(hasPermission(ctx, "catalog.write")).toBe(false);
    expect(hasPermission(ctx, "entitlement.admin")).toBe(false);
    expect(hasPermission(ctx, "partner.admin")).toBe(false);
    expect(hasPermission(ctx, "content.write")).toBe(false);
  });

  it("lets FINANCE move money but not manage users, catalog, or entitlements", () => {
    const ctx = { globalRole: "FINANCE" as const };
    expect(hasPermission(ctx, "finance.write")).toBe(true);
    expect(hasPermission(ctx, "finance.read")).toBe(true);
    expect(hasPermission(ctx, "admin.users.write")).toBe(false);
    expect(hasPermission(ctx, "catalog.write")).toBe(false);
    expect(hasPermission(ctx, "entitlement.admin")).toBe(false);
    expect(hasPermission(ctx, "content.write")).toBe(false);
  });

  it("lets ADMIN manage catalog/users/entitlements but not finance.write", () => {
    const ctx = { globalRole: "ADMIN" as const };
    expect(hasPermission(ctx, "catalog.write")).toBe(true);
    expect(hasPermission(ctx, "entitlement.admin")).toBe(true);
    expect(hasPermission(ctx, "admin.users.write")).toBe(true);
    expect(hasPermission(ctx, "partner.admin")).toBe(true);
    expect(hasPermission(ctx, "finance.read")).toBe(true);
    expect(hasPermission(ctx, "finance.write")).toBe(false);
  });

  it("grants SUPER_ADMIN finance.write on top of admin powers", () => {
    const perms = permissionsForContext({ globalRole: "SUPER_ADMIN" });
    expect(perms.has("finance.write")).toBe(true);
    expect(perms.has("entitlement.admin")).toBe(true);
    expect(perms.has("catalog.write")).toBe(true);
  });
});

describe("canAssignGlobalRole", () => {
  it("blocks ADMIN from creating or editing SUPER_ADMIN", () => {
    expect(canAssignGlobalRole("ADMIN", "USER", "SUPER_ADMIN")).toBe(false);
    expect(canAssignGlobalRole("ADMIN", "SUPER_ADMIN", "ADMIN")).toBe(false);
    expect(canAssignGlobalRole("ADMIN", "USER", "SUPPORT")).toBe(true);
    expect(canAssignGlobalRole("SUPER_ADMIN", "USER", "SUPER_ADMIN")).toBe(true);
    expect(canAssignGlobalRole("SUPPORT", "USER", "ADMIN")).toBe(false);
  });
});

describe("parseAdminReason", () => {
  it("rejects blank reasons", () => {
    expect(parseAdminReason("")).toBeNull();
    expect(parseAdminReason("  ab ")).toBeNull();
    expect(parseAdminReason("complimentary grant")).toBe("complimentary grant");
  });
});

describe("adminMfaRequired", () => {
  it("requires MFA for ADMIN/SUPER_ADMIN only in production", () => {
    expect(
      adminMfaRequired({ globalRole: "ADMIN", twoFactorEnabled: false, production: true }),
    ).toBe(true);
    expect(
      adminMfaRequired({ globalRole: "SUPER_ADMIN", twoFactorEnabled: true, production: true }),
    ).toBe(false);
    expect(
      adminMfaRequired({ globalRole: "ADMIN", twoFactorEnabled: false, production: false }),
    ).toBe(false);
    expect(
      adminMfaRequired({ globalRole: "SUPPORT", twoFactorEnabled: false, production: true }),
    ).toBe(false);
  });
});
