import { describe, expect, it } from "vitest";
import { buildReleaseWhatsNewDraftInput } from "./release-notify";

describe("buildReleaseWhatsNewDraftInput", () => {
  it("builds whats_new + software_update CTA scoped to the release", () => {
    const draft = buildReleaseWhatsNewDraftInput({
      id: "release-uuid",
      publicId: "rel_abcdefghijkl",
      productId: "product-uuid",
      version: "2.1.0",
      platform: "windows",
      architecture: "x64",
      channel: "stable",
      releaseNotesVi: "Sửa lỗi đăng nhập",
      releaseNotesEn: "Login fixes",
    });

    expect(draft.type).toBe("whats_new");
    expect(draft.ctaKind).toBe("software_update");
    expect(draft.relatedReleaseId).toBe("release-uuid");
    expect(draft.productId).toBe("product-uuid");
    expect(draft.targetPlatform).toBe("windows");
    expect(draft.maximumAppVersion).toBe("2.0.9999");
    expect(draft.ctaPayload).toEqual({
      releasePublicId: "rel_abcdefghijkl",
      actions: ["download", "auto_update"],
    });
    expect(draft.translations.some((t) => t.locale === "vi" && t.body?.includes("Sửa lỗi"))).toBe(
      true,
    );
  });
});
