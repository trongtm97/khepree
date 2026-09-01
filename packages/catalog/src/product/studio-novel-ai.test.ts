import { describe, expect, it } from "vitest";
import {
  detectAccessTermKind,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_TYPE_LABELS,
  resolveAccessTerm,
} from "./studio-field-policy";

describe("Novel AI studio configuration (concept)", () => {
  it("maps trial / monthly / yearly plans from generic UI presets", () => {
    const trial = resolveAccessTerm("trial", 1);
    expect(trial.billingType).toBe("free");
    expect(trial.accessTermDays).toBe(1);

    const monthly = resolveAccessTerm("month", 1);
    expect(monthly.billingType).toBe("one_time");
    expect(monthly.accessTermDays).toBe(30);

    const yearly = resolveAccessTerm("year", 1);
    expect(yearly.billingType).toBe("one_time");
    expect(yearly.accessTermDays).toBe(365);
  });

  it("round-trips plan term detection for Novel AI paid plans", () => {
    const month = detectAccessTermKind("one_time", 30);
    expect(month.kind).toBe("month");
    expect(month.count).toBe(1);

    const year = detectAccessTermKind("one_time", 365);
    expect(year.kind).toBe("year");
    expect(year.count).toBe(1);
  });

  it("supports AI + desktop taxonomy labels", () => {
    expect(PRODUCT_CATEGORY_LABELS["ai-tools"]).toBe("AI Tools");
    expect(PRODUCT_CATEGORY_LABELS.translation).toBe("Translation");
    expect(PRODUCT_TYPE_LABELS["desktop-software"]).toBe("Desktop Software");
  });
});
