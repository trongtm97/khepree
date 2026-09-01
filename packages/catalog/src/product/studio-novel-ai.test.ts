import { describe, expect, it } from "vitest";
import { resolveAccessTerm } from "./studio-field-policy";
import {
  deriveTechnicalIdentity,
  suggestAccessFeatureKey,
  suggestDesktopClientId,
  suggestDesktopProtocol,
  suggestInternalPlanCode,
  suggestProductCode,
} from "./technical-identity";

describe("Novel AI studio configuration (concept)", () => {
  const name = "Khepree Novel AI";

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

  it("auto-generates Novel AI technical identity", () => {
    expect(suggestProductCode(name)).toBe("KHEPREE_NOVEL_AI");
    expect(suggestAccessFeatureKey(name)).toBe("novel_ai.access");
    expect(suggestDesktopClientId(name)).toBe("khepree.novel-ai.desktop");
    expect(suggestDesktopProtocol(name)).toBe("khepreenovelai");

    const productCode = "KHEPREE_NOVEL_AI";
    expect(suggestInternalPlanCode(productCode, "trial")).toBe("NOVEL_AI_FREE_TRIAL");
    expect(suggestInternalPlanCode(productCode, "month")).toBe("NOVEL_AI_MONTHLY");
    expect(suggestInternalPlanCode(productCode, "year")).toBe("NOVEL_AI_YEARLY");
  });

  it("derives full desktop identity bundle", () => {
    const derived = deriveTechnicalIdentity({ name, productType: "desktop-software" });
    expect(derived.slug).toBe("khepree-novel-ai");
    expect(derived.desktopCallbackUri).toBe("khepreenovelai://auth/callback");
  });
});
