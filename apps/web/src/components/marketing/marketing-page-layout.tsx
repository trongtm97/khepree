import { Container, PageHeader } from "@khepree/ui";
import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { pageBreadcrumbJsonLd } from "@/lib/seo/page-breadcrumbs";

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
      <JsonLd data={pageBreadcrumbJsonLd(breadcrumbs)} />
      <Container className="px-5 py-12 sm:px-6 lg:py-16">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader title={title} description={description} />
        {children ? (
          plain ? (
            <div className="mt-8">{children}</div>
          ) : (
            <div className="prose-khepree mt-8 max-w-3xl text-muted">{children}</div>
          )
        ) : null}
      </Container>
    </>
  );
}
