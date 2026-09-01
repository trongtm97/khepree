import { describe, expect, it } from "vitest";
import {
  deriveDesktopCallbackUri,
  deriveTechnicalIdentity,
  suggestAccessFeatureKey,
  suggestDesktopClientId,
  suggestDesktopProtocol,
  suggestInternalPlanCode,
  suggestProductCode,
  validateCallbackUri,
  validateDesktopProtocol,
  validateProductCode,
} from "./technical-identity";

describe("technical-identity — Khepree Novel AI", () => {
  const name = "Khepree Novel AI";

  it("generates product code and access feature", () => {
    expect(suggestProductCode(name)).toBe("KHEPREE_NOVEL_AI");
    expect(suggestAccessFeatureKey(name)).toBe("novel_ai.access");
  });

  it("generates desktop client, protocol, and callback", () => {
    expect(suggestDesktopClientId(name)).toBe("khepree.novel-ai.desktop");
    expect(suggestDesktopProtocol(name)).toBe("khepreenovelai");
    expect(deriveDesktopCallbackUri("khepreenovelai")).toBe("khepreenovelai://auth/callback");
    expect(validateCallbackUri("khepreenovelai", "khepreenovelai://auth/callback")).toBe(true);
    expect(validateCallbackUri("khepreenovelai", "evil://auth/callback")).toBe(false);
  });

  it("generates plan internal codes from product code", () => {
    const productCode = "KHEPREE_NOVEL_AI";
    expect(suggestInternalPlanCode(productCode, "trial")).toBe("NOVEL_AI_FREE_TRIAL");
    expect(suggestInternalPlanCode(productCode, "month")).toBe("NOVEL_AI_MONTHLY");
    expect(suggestInternalPlanCode(productCode, "year")).toBe("NOVEL_AI_YEARLY");
  });

  it("derives full identity for desktop software", () => {
    const derived = deriveTechnicalIdentity({ name, productType: "desktop-software" });
    expect(derived.slug).toBe("khepree-novel-ai");
    expect(derived.productCode).toBe("KHEPREE_NOVEL_AI");
    expect(derived.accessFeatureKey).toBe("novel_ai.access");
    expect(derived.desktopClientId).toBe("khepree.novel-ai.desktop");
    expect(derived.desktopProtocol).toBe("khepreenovelai");
    expect(derived.desktopCallbackUri).toBe("khepreenovelai://auth/callback");
  });

  it("validates protocol and product code formats", () => {
    expect(validateProductCode("KHEPREE_NOVEL_AI")).toBe(true);
    expect(validateProductCode("bad-code")).toBe(false);
    expect(validateDesktopProtocol("khepreenovelai")).toBe(true);
    expect(validateDesktopProtocol("Bad_Protocol")).toBe(false);
  });
});

describe("technical-identity — idempotent regeneration", () => {
  it("keeps explicit overrides when provided", () => {
    const derived = deriveTechnicalIdentity({
      name: "Khepree Novel AI",
      productType: "desktop-software",
      slug: "custom-slug",
      productCode: "CUSTOM_CODE",
    });
    expect(derived.slug).toBe("custom-slug");
    expect(derived.productCode).toBe("CUSTOM_CODE");
  });
});
