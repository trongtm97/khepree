import { describe, expect, it } from "vitest";
import {
  assertPlanFeatureColumns,
  coercePlanFeatureRow,
  parsePlanFeatureValue,
} from "./plan-features";
import { createPublicId, isPublicId } from "./ids";
import { isEntitlementActive, resolvePrincipalId } from "./entitlements";

describe("createPublicId", () => {
  it("generates prefixed url-safe ids", () => {
    const id = createPublicId("prod");
    expect(id.startsWith("prod_")).toBe(true);
    expect(isPublicId(id, "prod")).toBe(true);
  });

  it("rejects invalid prefix", () => {
    expect(() => createPublicId("PRO")).toThrow();
  });
});

describe("plan feature values", () => {
  it("parses boolean values", () => {
    expect(parsePlanFeatureValue({ valueType: "boolean", booleanValue: true })).toEqual({
      valueType: "boolean",
      booleanValue: true,
    });
  });

  it("validates stored columns", () => {
    assertPlanFeatureColumns("integer", {
      booleanValue: null,
      integerValue: 5,
      stringValue: null,
    });
    expect(() =>
      assertPlanFeatureColumns("string", {
        booleanValue: null,
        integerValue: 5,
        stringValue: null,
      }),
    ).toThrow();
  });

  it("coerces row to typed value", () => {
    expect(
      coercePlanFeatureRow("string", {
        booleanValue: null,
        integerValue: null,
        stringValue: "enabled",
      }),
    ).toEqual({ valueType: "string", stringValue: "enabled" });
  });
});

describe("entitlement helpers", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("detects active entitlement window", () => {
    expect(
      isEntitlementActive({
        status: "active",
        startsAt: new Date("2026-01-01T00:00:00Z"),
        expiresAt: new Date("2026-12-31T00:00:00Z"),
        now,
      }),
    ).toBe(true);
  });

  it("rejects revoked status", () => {
    expect(
      isEntitlementActive({
        status: "revoked",
        startsAt: new Date("2026-01-01T00:00:00Z"),
        expiresAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("resolves principal ids", () => {
    expect(resolvePrincipalId("USER", "user_1", null)).toBe("user_1");
    expect(resolvePrincipalId("ORGANIZATION", null, "org_1")).toBe("org_1");
    expect(() => resolvePrincipalId("USER", null, null)).toThrow();
  });
});
