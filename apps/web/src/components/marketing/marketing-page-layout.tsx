import { Container, PageHeader } from "@khepree/ui";
import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

export interface MarketingPageLayoutProps {
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  children?: ReactNode;
  /** Skip prose wrapper — for custom article layouts. */
  plain?: boolean;
}

export function MarketingPageLayout({
  title,
  description,
  breadcrumbs,
  children,
  plain,
}: MarketingPageLayoutProps) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs.filter((b) => b.href).map((b) => ({ name: b.label, href: b.href! })))} />
      <Container className="py-12 lg:py-16">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader title={title} description={description} />
        {children ? (
          plain ? (
            <div className="mt-8">{children}</div>
          ) : (
            <div className="prose-khepree mt-8 max-w-3xl text-khepree-slate/80">{children}</div>
          )
        ) : null}
      </Container>
    </>
  );
}
