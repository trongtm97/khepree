/** Next.js cache tags for ISR revalidation after product catalog updates. */
export function productRevalidationTags(input: {
  slug: string;
  locale: string;
}): string[] {
  return [
    `product:${input.locale}:${input.slug}`,
    `product-locale:${input.locale}`,
    "products",
  ];
}

/** Path hints for apps/web revalidatePath after catalog updates. */
export function productRevalidationPaths(input: {
  slug: string;
  locale: string;
}): string[] {
  const base = `/${input.locale}`;
  return [`${base}/products/${input.slug}`, `${base}/products`, `${base}/pricing`];
}

export interface ProductRevalidationPlan {
  tags: string[];
  paths: string[];
}

export function buildProductRevalidationPlan(input: {
  slug: string;
  locale: string;
}): ProductRevalidationPlan {
  return {
    tags: productRevalidationTags(input),
    paths: productRevalidationPaths(input),
  };
}
