import { getOutboundLinkAttributes } from "@khepree/config";
import type { ComponentProps } from "react";

export interface ExternalLinkProps extends Omit<ComponentProps<"a">, "href"> {
  href: string;
  forceNewTab?: boolean;
}

/** Anchor that applies shared outbound link policy (nofollow for third-party). */
export function ExternalLink({ href, rel, forceNewTab, ...props }: ExternalLinkProps) {
  const policy = getOutboundLinkAttributes(href, { forceNewTab, rel });
  return <a href={href} {...props} {...policy} />;
}
