import type { PublicProductDetail } from "@khepree/catalog";
import type { ProductMarketingMetadata } from "@khepree/catalog";

export type ProductPageSectionId = "overview" | "solutions" | "features" | "pricing" | "guides" | "faq";

export interface ProductPageSection {
  id: ProductPageSectionId;
  labelKey: ProductPageSectionId;
}

/** Sections with content only — drives sticky product nav. */
export function listProductPageSections(product: PublicProductDetail): ProductPageSection[] {
  const { marketing } = product;
  const sections: ProductPageSection[] = [{ id: "overview", labelKey: "overview" }];

  if (hasSolutionsContent(marketing)) {
    sections.push({ id: "solutions", labelKey: "solutions" });
  }
  if (marketing.highlights?.length) {
    sections.push({ id: "features", labelKey: "features" });
  }
  if (product.plans.length > 0) {
    sections.push({ id: "pricing", labelKey: "pricing" });
  }
  if (marketing.relatedContent?.length) {
    sections.push({ id: "guides", labelKey: "guides" });
  }
  if (marketing.faq?.length) {
    sections.push({ id: "faq", labelKey: "faq" });
  }

  return sections;
}

export function hasSolutionsContent(marketing: ProductMarketingMetadata): boolean {
  if (marketing.solutions?.length) return true;
  return Boolean(marketing.benefits?.length);
}

export function listSolutionCards(
  marketing: ProductMarketingMetadata,
): Array<{ problem: string; helps: string; result: string | null }> {
  if (marketing.solutions?.length) {
    return marketing.solutions.map((item) => ({
      problem: item.problem,
      helps: item.helps,
      result: item.result || null,
    }));
  }
  return (marketing.benefits ?? []).map((item) => ({
    problem: item.title,
    helps: item.description,
    result: null,
  }));
}
