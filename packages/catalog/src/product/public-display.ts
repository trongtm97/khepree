import { deriveSeoFields } from "./studio-field-policy";
import { parseCoverMediaPublicId } from "./studio-field-policy";

export function resolvePublicSeoFields(input: {
  name: string;
  slug: string;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  metadata: Record<string, unknown>;
  hasIcon: boolean;
}) {
  const hasCover = Boolean(parseCoverMediaPublicId(input.metadata));
  return deriveSeoFields({
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription,
    seoTitleOverride: input.seoTitle,
    seoDescriptionOverride: input.seoDescription,
    hasCover,
    hasIcon: input.hasIcon,
  });
}
