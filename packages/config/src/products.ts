/** Supported product platforms — validation lives in catalog domain, not hard-coded cards. */
export const PRODUCT_PLATFORMS = ["desktop", "web", "mobile"] as const;
export type ProductPlatform = (typeof PRODUCT_PLATFORMS)[number];

export function isProductPlatform(value: string): value is ProductPlatform {
  return (PRODUCT_PLATFORMS as readonly string[]).includes(value);
}
