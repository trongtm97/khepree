import { describe, expect, it } from "vitest";
import { suggestProductSlug } from "./slug";
import { createProductPreviewToken, verifyProductPreviewToken } from "./preview-token";
import { computeProductReadiness } from "./studio/readiness";
import type { ProductStudioSnapshot } from "./studio/types";

describe("suggestProductSlug", () => {
  it("slugifies Vietnamese names", () => {
    expect(suggestProductSlug("Khepree Pro")).toBe("khepree-pro");
    expect(suggestProductSlug("  ")).toBe("san-pham");
  });
});

describe("product preview token", () => {
  it("round-trips within TTL", () => {
    const now = 1_700_000_000_000;
    const token = createProductPreviewToken({ productId: "abc", secret: "test-secret-32-chars-minimum!!", now });
    expect(
      verifyProductPreviewToken({
        productId: "abc",
        token,
        secret: "test-secret-32-chars-minimum!!",
        now: now + 1000,
      }),
    ).toBe(true);
    expect(
      verifyProductPreviewToken({
        productId: "other",
        token,
        secret: "test-secret-32-chars-minimum!!",
        now: now + 1000,
      }),
    ).toBe(false);
  });
});

function baseSnapshot(overrides: Partial<ProductStudioSnapshot> = {}): ProductStudioSnapshot {
  return {
    id: "p1",
    publicId: "prod_x",
    slug: "demo",
    status: "draft",
    licensingMode: "LICENSE_KEY_DEVICE",
    platformCapabilities: ["web"],
    iconMediaId: null,
    iconMediaPublicId: null,
    metadata: {},
    updatedAt: new Date(),
    translations: [
      {
        locale: "vi",
        name: "Sản phẩm demo",
        shortDescription: "Mô tả",
        description: null,
        content: null,
        seoTitle: null,
        seoDescription: null,
      },
    ],
    plans: [],
    publishedReleaseCount: 0,
    ...overrides,
  };
}

describe("computeProductReadiness", () => {
  it("requires Vietnamese name and slug", () => {
    const result = computeProductReadiness(baseSnapshot());
    expect(result.ready).toBe(true);
    expect(result.blockingCount).toBe(0);
  });

  it("blocks commercial publish without active priced plan", () => {
    const result = computeProductReadiness(
      baseSnapshot({
        plans: [
          {
            id: "pl1",
            publicId: "plan_x",
            slug: "pro",
            billingType: "one_time",
            accessTermDays: 30,
            status: "draft",
            nameVi: "Pro",
            nameEn: "Pro",
            prices: [],
            features: [],
          },
        ],
      }),
    );
    expect(result.ready).toBe(false);
    expect(result.blockingCount).toBeGreaterThan(0);
  });

  it("passes when active plan has VND price", () => {
    const result = computeProductReadiness(
      baseSnapshot({
        plans: [
          {
            id: "pl1",
            publicId: "plan_x",
            slug: "pro",
            billingType: "one_time",
            accessTermDays: 365,
            status: "active",
            nameVi: "Pro 1 năm",
            nameEn: "Pro yearly",
            prices: [
              {
                id: "pr1",
                publicId: "price_x",
                currency: "VND",
                region: null,
                amountMinor: 599_000n,
                interval: null,
                isActive: true,
              },
            ],
            features: [],
          },
        ],
      }),
    );
    expect(result.ready).toBe(true);
  });
});
