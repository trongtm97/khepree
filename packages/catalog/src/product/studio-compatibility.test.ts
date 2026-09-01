import { describe, expect, it } from "vitest";
import { STUDIO_FEATURE_KEYS, resolveAccessTerm } from "./studio-field-policy";

/**
 * Regression guards for Product Studio ↔ commerce/licensing compatibility.
 * Studio writes standard plans/prices/plan_features — no parallel "studio price" table.
 */
describe("studio domain compatibility", () => {
  it("maps Novel AI trial plan to free billing + 1-day access term", () => {
    const trial = resolveAccessTerm("trial", 1);
    expect(trial.billingType).toBe("free");
    expect(trial.accessTermDays).toBe(1);
  });

  it("maps Novel AI monthly/yearly to one_time + standard day counts", () => {
    const monthly = resolveAccessTerm("month", 1);
    expect(monthly.billingType).toBe("one_time");
    expect(monthly.accessTermDays).toBe(30);

    const yearly = resolveAccessTerm("year", 1);
    expect(yearly.billingType).toBe("one_time");
    expect(yearly.accessTermDays).toBe(365);
  });

  it("uses entitlement feature keys as single source of truth for licensing limits", () => {
    expect(STUDIO_FEATURE_KEYS.devicesMax).toBe("devices.max");
    expect(STUDIO_FEATURE_KEYS.accountRequired).toBe("account.required");
    // ponytail: no product.deviceLimit column — plan_features only
  });
});
