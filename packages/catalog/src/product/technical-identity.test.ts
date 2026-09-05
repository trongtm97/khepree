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
  validateDesktopClientId,
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

describe("technical-identity — Khepree Livestream AI", () => {
  const name = "Khepree Livestream AI";

  it("derives catalog identity matching the desktop app contract", () => {
    const derived = deriveTechnicalIdentity({ name, productType: "desktop-software" });
    expect(derived.slug).toBe("khepree-livestream-ai");
    expect(derived.productCode).toBe("KHEPREE_LIVESTREAM_AI");
    expect(derived.accessFeatureKey).toBe("livestream_ai.access");
    expect(derived.desktopProtocol).toBe("khepreelivestreamai");
    expect(derived.desktopCallbackUri).toBe("khepreelivestreamai://auth/callback");
  });

  it("accepts the hyphenated desktop client id shipped by the app", () => {
    expect(validateDesktopClientId("khepree-livestream-ai-desktop")).toBe(true);
    expect(validateDesktopClientId("khepree.livestream-ai.desktop")).toBe(true);
    expect(validateDesktopClientId("khepree")).toBe(false);
  });

  it("maps commercial plan codes from Product Studio presets", () => {
    expect(suggestInternalPlanCode("KHEPREE_LIVESTREAM_AI", "trial")).toBe("LIVESTREAM_AI_FREE_TRIAL");
    expect(suggestInternalPlanCode("KHEPREE_LIVESTREAM_AI", "month")).toBe("LIVESTREAM_AI_MONTHLY");
    expect(suggestInternalPlanCode("KHEPREE_LIVESTREAM_AI", "year")).toBe("LIVESTREAM_AI_YEARLY");
  });
});

describe("technical-identity — Khepree TTS Batch AI", () => {
  const name = "Khepree TTS Batch AI";

  it("derives catalog identity matching the desktop app contract", () => {
    const derived = deriveTechnicalIdentity({ name, productType: "desktop-software" });
    expect(derived.slug).toBe("khepree-tts-batch-ai");
    expect(derived.productCode).toBe("KHEPREE_TTS_BATCH_AI");
    expect(derived.accessFeatureKey).toBe("tts_batch_ai.access");
    expect(derived.desktopProtocol).toBe("khepreettsbatchai");
    expect(derived.desktopCallbackUri).toBe("khepreettsbatchai://auth/callback");
  });

  it("accepts the hyphenated desktop client id shipped by the app", () => {
    expect(validateDesktopClientId("khepree-tts-batch-ai-desktop")).toBe(true);
    expect(validateDesktopClientId("khepree.tts-batch-ai.desktop")).toBe(true);
  });

  it("maps commercial plan codes from Product Studio presets", () => {
    expect(suggestInternalPlanCode("KHEPREE_TTS_BATCH_AI", "trial")).toBe("TTS_BATCH_AI_FREE_TRIAL");
    expect(suggestInternalPlanCode("KHEPREE_TTS_BATCH_AI", "month")).toBe("TTS_BATCH_AI_MONTHLY");
    expect(suggestInternalPlanCode("KHEPREE_TTS_BATCH_AI", "year")).toBe("TTS_BATCH_AI_YEARLY");
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
