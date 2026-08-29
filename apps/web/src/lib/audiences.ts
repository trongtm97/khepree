export const AUDIENCE_SLUGS = ["creators", "professionals", "entrepreneurs", "business"] as const;
export type AudienceSlug = (typeof AUDIENCE_SLUGS)[number];

export function isAudienceSlug(value: string): value is AudienceSlug {
  return (AUDIENCE_SLUGS as readonly string[]).includes(value);
}
