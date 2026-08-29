import {
  createProductService,
  productRevalidationTags,
} from "@khepree/catalog";
import { unstable_cache } from "next/cache";

export function getProductService() {
  return createProductService();
}

export async function getPublicProducts(locale: string) {
  return unstable_cache(
    () => getProductService().listPublicProducts({ locale }),
    [`public-products-${locale}`],
    {
      revalidate: 3600,
      tags: [`product-locale:${locale}`, "products"],
    },
  )();
}

export async function getPublicProductBySlug(slug: string, locale: string) {
  return unstable_cache(
    () => getProductService().getPublicProductBySlug(slug, { locale }),
    [`public-product-${locale}-${slug}`],
    {
      revalidate: 3600,
      tags: productRevalidationTags({ slug, locale }),
    },
  )();
}

export async function getPricingGroups(locale: string) {
  return unstable_cache(
    () => getProductService().listPricingGroups({ locale }),
    [`pricing-groups-${locale}`],
    {
      revalidate: 3600,
      tags: [`product-locale:${locale}`, "products", "pricing"],
    },
  )();
}
