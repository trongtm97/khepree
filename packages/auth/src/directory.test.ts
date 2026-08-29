import { describe, expect, it } from "vitest";
import { canAssignGlobalRole, parseAdminReason } from "@khepree/security";
import { IdentityError } from "./directory";

describe("identity admin guards", () => {
  it("requires a reason for high-risk identity actions", () => {
    expect(parseAdminReason("ok")).toBeNull();
    expect(parseAdminReason("account takeover review")).toBeTruthy();
  });

  it("IdentityError is distinguishable", () => {
    const error = new IdentityError("FORBIDDEN", "no");
    expect(error.code).toBe("FORBIDDEN");
  });

  it("keeps SUPER_ADMIN assignment on SUPER_ADMIN only", () => {
    expect(canAssignGlobalRole("ADMIN", "SUPPORT", "FINANCE")).toBe(true);
    expect(canAssignGlobalRole("ADMIN", "USER", "SUPER_ADMIN")).toBe(false);
  });
});
