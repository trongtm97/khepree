import { describe, expect, it } from "vitest";
import { getMessages } from "@/lib/i18n/get-messages";
import { toNavProducts } from "./nav-products";

describe("toNavProducts", () => {
  it("maps catalog products to nav items with localized platform labels", () => {
    const messages = getMessages("vi");
    const items = toNavProducts(
      [
        {
          publicId: "prod_1",
          slug: "sample",
          name: "Sample App",
          shortDescription: "Short copy",
          description: null,
          platforms: ["desktop"],
          operatingSystems: [],
          status: "active",
          seoTitle: null,
          seoDescription: null,
          locale: "vi",
          availableLocales: ["vi"],
          icon: { url: "https://cdn.example/icon.png", altText: "Icon" },
          cover: null,
          gallery: [],
          startingPrice: null,
          updatedAt: new Date(),
        },
      ],
      "vi",
      messages,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.href).toBe("/vi/products/sample");
    expect(items[0]?.platformLabel).toBe(messages.catalog.platforms.desktop);
    expect(items[0]?.iconUrl).toBe("https://cdn.example/icon.png");
  });
});
